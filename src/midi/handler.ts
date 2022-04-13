import { setTimeoutPromise } from '../utils/promise';
import * as JZZ from 'jzz';
import { JZZTypes } from '../custom-typing/jzz';
import { Command, CONFIG, ERROR_MSG } from '../configuration/constants';
import { forwardQueue, waitForMyTurn, clearAllQueues } from './queue';
import { SharedVariable } from '../shared-variable/implementation';
import { initClockData, isClockActive, isSyncing, startClock, stopClock } from './clock';
import { processChordProgression } from './utils';
import { CCCommand } from './types';

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
 * Sends a list of notes to the virtual MIDI device with a programmed delayed trigger for NoteOff
 * It differs from _triggerNoteList because this method returns instantly instead of waiting for the message to be sent
 * @param noteList Single note or list of notes
 * @param release Time between NoteOn and NoteOff
 * @param channels Target MIDI channel for the virtual MIDI device
 */
export function triggerNotes(noteList: number | string | string[], release: number, channels: number) {
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
 * Triggers a chord progression
 * @param rawChordProgression Chord progression to trigger
 * @param targetMIDIChannel Virtual device MIDI channel
 * @param type 'sendloop' or 'sendchord'
 * @param myTurn My turn in the queue
 */
export async function triggerChordList(rawChordProgression: string, targetMIDIChannel: number, type: Command.sendloop | Command.sendchord, myTurn: number): Promise<void> {
    // If the MIDI clock has not started yet, start it to make the chord progression sound
    _autoStartClock(targetMIDIChannel);
    // Reset sync flag
    isSyncing.set(false);

    const chordProgression = processChordProgression(rawChordProgression, tempo.get());

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
        await triggerChord(noteList, timeout, targetMIDIChannel);
    }
    // Move to next in queue
    forwardQueue(type);
    isChordInProgress.set(false);
}

/**
 * Sends a list of notes to the virtual MIDI device with a timeout between NoteOn and NoteOff
 * @param noteList Single note or list of notes
 * @param release Time between NoteOn and NoteOff
 * @param channels Target MIDI channel for the virtual MIDI device
 */
export async function triggerChord(noteList: number | string | string[], release: number, channels: number) {
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
 * Sends a list of CC messages to the virtual MIDI device with a timeout between values
 * @param ccCommandList List of CC Commands
 * @param targetMIDIChannel Virtual MIDI device channel
 */
export function triggerCCCommandList(ccCommandList: CCCommand[], targetMIDIChannel: number): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    for (const [controller, value, time] of ccCommandList) {
        output.wait(time).control(targetMIDIChannel, controller, value);
    }
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
 * Checks if the clock is active and if not, it starts it
 * @param targetMIDIChannel Virtual MIDI device channel
 */
function _autoStartClock(targetMIDIChannel: number): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    if (!isClockActive()) {
        startClock(targetMIDIChannel, output, tempo.get());
    }
}
