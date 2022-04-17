import { setTimeoutPromise } from '../utils/promise';
import * as JZZ from 'jzz';
import { JZZTypes } from '../custom-typing/jzz';
import { CONFIG, ERROR_MSG } from '../configuration/constants';
import { forwardQueue, waitForMyTurn, clearAllQueues } from '../command/queue';
import { SharedVariable } from '../shared-variable/implementation';
import { initClockData, isClockActive, isSyncing, startClock, stopClock } from './clock';
import { CCCommand, Command } from '../command/types';

// IMPORTANT: ONLY THIS FILE CONTAINS A MIDI CONNECTION
// For example, the clock uses the MIDI connection but it is always provided as an argument
// ALL MIDI MANAGEMENT IS DONE HERE
let output: ReturnType<JZZTypes['openMidiOut']> | undefined;

// Closure variables
export const tempo = new SharedVariable<number>(CONFIG.DEFAULT_TEMPO);
export const volume = new SharedVariable<number>(CONFIG.DEFAULT_VOLUME);
export const currentChordMode = new SharedVariable<Command.sendchord | Command.sendloop | undefined>(undefined);
export const isChordInProgress = new SharedVariable<boolean>(false);

/**
 * Initializes the common variables
 */
export function initVariables(): void {
    initClockData();
    isChordInProgress.set(false);
    currentChordMode.set(undefined);
    tempo.set(CONFIG.DEFAULT_TEMPO);
    volume.set(CONFIG.DEFAULT_VOLUME);
}

/**
 * Connects to the virtual MIDI device
 * @param targetMIDIName Virtual MIDI device name
 */
export async function connectMIDI(targetMIDIName: string): Promise<void> {
    const midi = await JZZ.default();
    output = midi.openMidiOut(targetMIDIName);
}

/**
 * Disconnects the virtual MIDI device
 */
export async function disconnectMIDI(): Promise<void> {
    await output?.close();
    output = undefined;
}

/**
 * Checks if there is a valid MIDI connection and throws an error if not
 */
export function checkMIDIConnection(): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
}

/**
 * Triggers a list of notes
 * @param rawNoteList List of notes
 * @param targetMIDIChannel Virtual device MIDI channel
 */
export function triggerNoteList(rawNoteList: Array<[note: string, timeSubDivision: number]>, targetMIDIChannel: number) {
    const noteList = _processNoteList(rawNoteList, tempo.get());
    for (const [note, timeout] of noteList) {
        _sendMIDINoteList(note, timeout, targetMIDIChannel);
    }
}

/**
 * Triggers a chord progression
 * @param rawChordProgression Chord progression to trigger
 * @param targetMIDIChannel Virtual device MIDI channel
 * @param type 'sendloop' or 'sendchord'
 * @param myTurn My turn in the queue
 */
export async function triggerChordList(
    rawChordProgression: Array<[noteList: string[], timeSubDivision: number]>,
    targetMIDIChannel: number,
    type: Command.sendloop | Command.sendchord,
    myTurn: number
): Promise<void> {
    // If the MIDI clock has not started yet, start it to make the chord progression sound
    autoStartClock(targetMIDIChannel);
    // Reset sync flag
    isSyncing.set(false);

    const chordProgression = _processChordProgression(rawChordProgression, tempo.get());
    // We wait until the bar starts and is your turn
    await waitForMyTurn(myTurn, type);

    // Blocking section
    isChordInProgress.set(true);
    // Set which mode is active now
    currentChordMode.set(type);
    for (const [noteList, timeout] of chordProgression) {
        // Skip iteration if tempo or sync changes
        if (isSyncing.get()) {
            continue;
        }
        await _sendMIDINoteListPromise(noteList, timeout, targetMIDIChannel);
    }
    // Move to next in queue
    forwardQueue(type);
    isChordInProgress.set(false);
}

/**
 * Sends a list of CC messages to the virtual MIDI device with a timeout between values
 * @param rawCCCommandList List of CC Commands
 * @param targetMIDIChannel Virtual MIDI device channel
 */
export function triggerCCCommandList(rawCCCommandList: CCCommand[], targetMIDIChannel: number): void {
    const ccCommandList = _processCCCommandList(rawCCCommandList);
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    for (const [controller, value, time] of ccCommandList) {
        output.wait(time).control(targetMIDIChannel, controller, value);
    }
}

/**
 * Starts/resets the clock with the given tempo
 * @param targetMIDIChannel Virtual MIDI device channel
 * @param tempo Tempo in BPM
 */
export function triggerClock(targetMIDIChannel: number, tempo: number): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    startClock(targetMIDIChannel, output, tempo);
}

/**
 * Checks if the clock is active and if not, it starts it
 * @param targetMIDIChannel Virtual MIDI device channel
 */
export function autoStartClock(targetMIDIChannel: number): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    if (!isClockActive()) {
        startClock(targetMIDIChannel, output, tempo.get());
    }
}

/**
 * Stops all MIDI messages
 * @param targetMIDIChannel Virtual MIDI device channel
 */
export function stopAllMidi(targetMIDIChannel: number): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    output.stop();
    output.allNotesOff(targetMIDIChannel);
    stopClock();
    clearAllQueues();
}

/**
 * Sends a list of notes to the virtual MIDI device with a programmed delayed trigger for NoteOff
 * It differs from _triggerNoteList because this method returns instantly instead of waiting for the message to be sent
 * @param noteList Single note or list of notes
 * @param release Time between NoteOn and NoteOff
 * @param channels Target MIDI channel for the virtual MIDI device
 */
function _sendMIDINoteList(noteList: number | string | string[], release: number, channels: number) {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    const parsedNoteList = !Array.isArray(noteList) ? [noteList] : noteList;
    const releaseTime = Math.round(release / 1_000_000);
    for (const note of parsedNoteList) {
        output.note(channels, note, volume.get(), releaseTime);
    }
}

/**
 * Sends a list of notes to the virtual MIDI device with a timeout between NoteOn and NoteOff
 * @param noteList Single note or list of notes
 * @param release Time between NoteOn and NoteOff
 * @param channels Target MIDI channel for the virtual MIDI device
 */
async function _sendMIDINoteListPromise(noteList: number | string | string[], release: number, channels: number) {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    const parsedNoteList = !Array.isArray(noteList) ? [noteList] : noteList;
    for (const note of parsedNoteList) {
        output.noteOn(channels, note, volume.get());
    }
    await setTimeoutPromise(release);
    for (const note of parsedNoteList) {
        output.noteOff(channels, note, volume.get());
    }
}

/**
 * Parses a message and generates a list of notes
 * @param message Command arguments (list of notes)
 * @param tempo Tempo
 * @returns List of [note,timeout] tuples
 */
function _processNoteList(noteList: Array<[note: string, timeSubDivision: number]>, tempo: number): Array<[note: string, timeout: number]> {
    return noteList.map(([note, timeSubDivision]) => [note, _calculateTimeout(timeSubDivision, tempo)]);
}

/**
 * Processes a chord progression string to be played in a 4/4 beat
 * @param chordProgression Chord progression separated by spaces
 * @return List of notes to play with their respective release times
 */
function _processChordProgression(chordProgressionList: Array<[noteList: string[], timeSubDivision: number]>, tempo: number): Array<[noteList: string[], timeout: number]> {
    const lastChordIndex = chordProgressionList.length - 1;
    return chordProgressionList.map(([chord, timeSubdivision], index) => {
        // If it is the last, reduce the note length to make sure the loop executes properly
        const multiplier = index !== lastChordIndex ? 1 : 0.8;
        return [chord, Math.round(_calculateTimeout(timeSubdivision, tempo) * multiplier)];
    });
}

/**
 * Processes a set of CC commands to be sent with their respective delays and calculating intermediary values (sweep)
 * @param rawCCCommandList List of CC commands
 * @param precision The amoutn of steps for sweeps
 * @return List of processed CC commands
 */
function _processCCCommandList(rawCCCommandList: CCCommand[], precision = CONFIG.DEFAULT_SWEEP_PRECISION): Array<CCCommand> {
    if (rawCCCommandList.length < 1) {
        throw new Error(ERROR_MSG.BAD_MIDI_MESSAGE);
    }
    // First command
    let ccCommandList: CCCommand[] = [rawCCCommandList[0]];
    // Next commands
    for (let preIndex = 0, postIndex = 1; preIndex < rawCCCommandList.length - 1, postIndex < rawCCCommandList.length; preIndex++, postIndex++) {
        const pre = rawCCCommandList[preIndex];
        const post = rawCCCommandList[postIndex];
        // If there's a sweep
        const newCommandMacro = _isSweep(pre, post) ? _calculateCCSweep(pre, post, precision) : [post];
        ccCommandList = ccCommandList.concat(newCommandMacro);
    }
    return ccCommandList;
}

/**
 * Calculates the length of a determined amount of quarter notes in a particular tempo
 * @param chordNoteToken Chord or note from which to extract the quarter note amount
 * @param tempo Tempo to check against
 * @returns Length in nanoseconds
 */
function _calculateTimeout(timeDivision: number, tempo: number): number {
    const parsedTimeDivision = timeDivision === 0 ? 4 : timeDivision;
    return Math.round((60_000_000_000 * parsedTimeDivision) / tempo);
}

/**
 * Checks if a set of two CC commands have to be treated as a sweep
 * @param pre First command
 * @param post Second command
 * @returns boolean
 */
function _isSweep([preController, , preTime]: CCCommand, [postController, , postTime]: CCCommand): boolean {
    return preController === postController && postTime - preTime !== 0;
}

/**
 * Calculates a sweep between two different CC commands with the same controller
 * @param pre First commmand
 * @param post Second command
 * @param precision How many commands to interpolate and return
 * @returns Command list
 */
function _calculateCCSweep([, preValue, preTime]: CCCommand, [postController, postValue, postTime]: CCCommand, precision: number): CCCommand[] {
    return _sweep(preValue, postValue, preTime, postTime, precision).map<CCCommand>(([value, time]) => [postController, value, time]);
}

/**
 * Calculates a sweep between two different values in a time lapse with a particular precission
 * @param startValue Start value
 * @param endValue End value
 * @param startTime Start time
 * @param endTime End time
 * @param precision How many values to create
 * @returns List of interpolated values
 */
function _sweep(startValue: number, endValue: number, startTime: number, endTime: number, precision = CONFIG.DEFAULT_SWEEP_PRECISION): Array<[value: number, time: number]> {
    const direction = startValue <= endValue ? 1 : -1;
    const timeStepSize = Math.abs(endTime - startTime) / precision;
    const valueStepSize = Math.abs(endValue - startValue) / precision;
    const result: Array<[value: number, time: number]> = [];
    for (let index = 1; index <= precision; index++) {
        const value = Math.round(startValue + valueStepSize * index * direction);
        const time = Math.round(startTime + timeStepSize * index);
        result.push([value, time]);
    }
    return result;
}
