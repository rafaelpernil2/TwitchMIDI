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
let globalTempo = CONFIG.DEFAULT_TEMPO;
let globalVolume = CONFIG.DEFAULT_VOLUME;
export const currentChordMode = new SharedVariable<Command.sendchord | Command.sendloop | undefined>(undefined);
export const isChordInProgress = new SharedVariable<boolean>(false);

/**
 * Connects to the virtual MIDI device
 * @param targetMIDIName Virtual MIDI device name
 */
export async function connectMIDI(targetMIDIName: string): Promise<void> {
    _initVariables();
    const midi = await JZZ.default();
    output = midi.openMidiOut(targetMIDIName);
}

/**
 * Disconnects the virtual MIDI device
 * @param targetMIDIChannel Virtual MIDI device channel
 */
export async function disconnectMIDI(targetMIDIChannel: number): Promise<void> {
    stopAllMidi(targetMIDIChannel);
    await setTimeoutPromise(3_000_000_000);
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
 * Sets the MIDI volume
 * @param value Number between 0 and 100
 */
export function setMIDIVolume(value: number): void {
    if (isNaN(value) || value < 0 || value > 100) {
        throw new Error(ERROR_MSG.INVALID_VOLUME);
    }
    // Convert to range 0-127
    globalVolume = Math.round(value * 1.27);
}

/**
 * Triggers a list of notes
 * @param rawNoteList List of notes
 * @param targetMIDIChannel Virtual device MIDI channel
 */
export function triggerNoteList(rawNoteList: Array<[note: string, timeSubDivision: number]>, targetMIDIChannel: number): void {
    const noteList = _processNoteList(rawNoteList, globalTempo);
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
    _autoStartClock(targetMIDIChannel);
    // Reset sync flag
    isSyncing.set(false);

    // We wait until the bar starts and is your turn
    await waitForMyTurn(myTurn, type);
    const chordProgression = _processChordProgression(rawChordProgression, globalTempo);

    // Blocking section
    isChordInProgress.set(true);
    // Set which mode is active now
    currentChordMode.set(type);
    for (const [noteList, timeout] of chordProgression) {
        // Skip iteration if tempo or sync changes
        if (isSyncing.get()) continue;
        await _sendMIDINoteListPromise(noteList, timeout, targetMIDIChannel);
    }
    // This way only the active loop gets skipped
    if (!isSyncing.get()) {
        // Move to next in queue
        forwardQueue(type);
    }
    isSyncing.set(false);
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
 * @param newTempo Tempo in BPM
 */
export function triggerClock(targetMIDIChannel: number, newTempo?: number): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    if (newTempo != null) {
        globalTempo = newTempo;
    }
    startClock(targetMIDIChannel, output, globalTempo);
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
 * Initializes the common variables
 */
function _initVariables(): void {
    initClockData();
    isChordInProgress.set(false);
    currentChordMode.set(undefined);
    globalTempo = CONFIG.DEFAULT_TEMPO;
    globalVolume = CONFIG.DEFAULT_VOLUME;
}

/**
 * Sends a list of notes to the virtual MIDI device with a programmed delayed trigger for NoteOff
 * It differs from _triggerNoteList because this method returns instantly instead of waiting for the message to be sent
 * @param noteList Single note or list of notes
 * @param release Time between NoteOn and NoteOff
 * @param channels Target MIDI channel for the virtual MIDI device
 */
function _sendMIDINoteList(noteList: number | string | string[], release: number, channels: number): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    const parsedNoteList = !Array.isArray(noteList) ? [noteList] : noteList;
    const releaseTime = Math.round(release / 1_000_000);
    for (const note of parsedNoteList) {
        output.note(channels, note, globalVolume, releaseTime);
    }
}

/**
 * Sends a list of notes to the virtual MIDI device with a timeout between NoteOn and NoteOff
 * @param noteList Single note or list of notes
 * @param release Time between NoteOn and NoteOff
 * @param channels Target MIDI channel for the virtual MIDI device
 */
async function _sendMIDINoteListPromise(noteList: number | string | string[], release: number, channels: number): Promise<void> {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    const parsedNoteList = !Array.isArray(noteList) ? [noteList] : noteList;
    for (const note of parsedNoteList) {
        output.noteOn(channels, note, globalVolume);
    }
    await setTimeoutPromise(release);
    for (const note of parsedNoteList) {
        output.noteOff(channels, note, globalVolume);
    }
}

/**
 * Parses a message and generates a list of notes
 * @param noteList Command arguments (list of notes)
 * @param tempo Tempo
 * @returns List of [note,timeout] tuples
 */
function _processNoteList(noteList: Array<[note: string, timeSubDivision: number]>, tempo: number): Array<[note: string, timeout: number]> {
    return noteList.map(([note, timeSubDivision]) => [note, _calculateTimeout(timeSubDivision, tempo)]);
}

/**
 * Processes a chord progression string to be played in a 4/4 beat
 * @param chordProgressionList Chord progression separated by spaces
 * @param tempo Tempo
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
 * @return List of processed CC commands
 */
function _processCCCommandList(rawCCCommandList: CCCommand[]): Array<CCCommand> {
    if (rawCCCommandList.length < 1) {
        throw new Error(ERROR_MSG.BAD_MIDI_MESSAGE);
    }
    // First command
    let ccCommandList: CCCommand[] = [rawCCCommandList[0]];
    // Next commands
    for (let preIndex = 0, postIndex = 1; preIndex < rawCCCommandList.length - 1, postIndex < rawCCCommandList.length; preIndex++, postIndex++) {
        const [pre, post] = [rawCCCommandList[preIndex], rawCCCommandList[postIndex]];
        // If there's a sweep
        const newCommandMacro = _isSweep(pre, post) ? _calculateCCSweep(pre, post) : [post];
        ccCommandList = ccCommandList.concat(newCommandMacro);
    }
    return ccCommandList;
}

/**
 * Calculates the length of a determined amount of quarter notes in a particular tempo
 * @param timeDivision Quarter note amount
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
 * @returns Command list
 */
function _calculateCCSweep([, preValue, preTime]: CCCommand, [postController, postValue, postTime]: CCCommand): CCCommand[] {
    return _sweep([preValue, preTime], [postValue, postTime]).map<CCCommand>(([value, time]) => [postController, value, time]);
}

/**
 * Calculates a sweep between two different values in a time lapse with a particular frequency
 * @param start [startValue, startTime]
 * @param end [endValue, endTime]
 * @param frequency How many values to create at max per second
 * @returns List of interpolated values
 */
function _sweep(
    [startValue, startTime]: [startValue: number, startTime: number],
    [endValue, endTime]: [endValue: number, endTime: number],
    frequency = CONFIG.DEFAULT_SWEEP_FREQUENCY
): Array<[value: number, time: number]> {
    if (startTime > endTime) {
        throw new Error(ERROR_MSG.BAD_SWEEP_DELAY);
    }
    const stepCount = ((endTime - startTime) / 1000) * frequency;

    const direction = startValue <= endValue ? 1 : -1;
    const [timeStepSize, valueStepSize] = [Math.abs(endTime - startTime) / stepCount, Math.abs(endValue - startValue) / stepCount];
    const result: Array<[value: number, time: number]> = [];
    for (let step = 1; step <= stepCount; step++) {
        const [value, time] = [Math.round(startValue + valueStepSize * step * direction), Math.round(startTime + timeStepSize * step)];
        // Skip if value stays the same and wait for a change
        if (result?.[result.length - 1]?.[0] === value) {
            continue;
        }
        result.push([value, time]);
    }
    return result;
}

/**
 * Checks if the clock is active and if not, it starts it
 * @param targetMIDIChannel Virtual MIDI device channel
 */
function _autoStartClock(targetMIDIChannel: number): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    if (!isClockActive()) {
        startClock(targetMIDIChannel, output, globalTempo);
    }
}
