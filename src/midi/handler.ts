import { setTimeoutPromise } from '../utils/promise';
import * as JZZ from 'jzz';
import { JZZTypes } from '../custom-typing/jzz';
import { CHORD_PROGRESSIONS } from '../database/jsondb/types';
import { ResponseStatus } from '../database/interface';
import { ALIASES_DB, CONFIG, ERROR_MSG, GLOBAL, REWARDS_DB } from '../configuration/constants';
import { firstMessageValue, splitMessageArguments } from '../twitch/chat/utils';
import { clearQueue, forwardQueue, waitForMyTurn, queue, clearQueueList, clearAllQueues, currentTurnMap, isQueueEmpty, rollbackClearQueue } from './queue';
import { SharedVariable } from '../shared-variable/implementation';
import { initClockData, isClockActive, isSyncing, startClock, stopClock } from './clock';
import { getCCCommandList, processCCCommandList, parseNote, calculateTimeout, getChordProgression, processChordProgression } from './utils';

// MIDI variable
let output: ReturnType<JZZTypes['openMidiOut']> | undefined;

// Closure variables
let tempo: number;
let volume: number;

export const currentChordMode = new SharedVariable<'sendchord' | 'sendloop'>();
export const isChordInProgress = new SharedVariable<boolean>(false);

_initVariables();

/**
 * Initializes MIDI connectivity and allows the bot to work
 * @param targetMIDIName The Virtual MIDI device name set in .env
 */
export async function midion(targetMIDIName: string): Promise<void> {
    try {
        const midi = await JZZ.default();
        _initVariables();
        output = midi.openMidiOut(targetMIDIName);
        console.log('MIDI connection stablished!');
    } catch (error) {
        throw new Error(ERROR_MSG.MIDI_CONNECTION_ERROR);
    }
}

/**
 * Disables MIDI connectivity and stops all MIDI
 */
export async function midioff(targetMIDIChannel: number): Promise<void> {
    try {
        fullstopmidi(targetMIDIChannel);
        await setTimeoutPromise(3_000_000_000);
        await output?.close();
        output = undefined;
        console.log('MIDI disconnected!');
    } catch (error) {
        throw new Error(ERROR_MSG.MIDI_DISCONNECTION_ERROR);
    }
}

/**
 * Sets a partitular tempo and starts playing
 * @param message Command arguments (tempo)
 * @return Parsed tempo value
 */
export function settempo(targetMIDIChannel: number, message: string): number {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    const newTempo = Number(firstMessageValue(message));
    if (isNaN(newTempo) || newTempo < CONFIG.MIN_TEMPO || newTempo > CONFIG.MAX_TEMPO) {
        throw new Error(ERROR_MSG.INVALID_TEMPO);
    }
    tempo = newTempo;
    // Generates a MIDI clock
    startClock(targetMIDIChannel, output, tempo);

    return tempo;
}

/**
 * Sends a particular CC Message, a list of CC messages separated by comma or a set of commands using an alias
 * @param message Command arguments (cc message or alias)
 * @param channels Target MIDI channel for the virtual MIDI device
 * @return A list of the messages sent without duplicates
 */
export function sendcc(message: string, channels: number): Array<[key: number, value: number, time: number]> {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }

    const rawCCCommandList = getCCCommandList(message);
    const ccCommandList = processCCCommandList(rawCCCommandList);

    for (const [controller, value, time] of ccCommandList) {
        output.wait(time).control(channels, controller, value);
    }

    return rawCCCommandList;
}

/**
 * Sends a set of MIDI notes separated by spaces
 * @param message Command arguments (notes)
 * @param channels Target MIDI channel for the virtual MIDI device
 */
export function sendnote(message: string, channels: number): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    const noteList = splitMessageArguments(message);
    const parsedNoteList = noteList.map<[note: string, tempo: number]>((note) => [parseNote(note), calculateTimeout(note, tempo)]);
    for (const [note, timeout] of parsedNoteList) {
        _triggerNoteListDelay(note, timeout, channels);
    }
}

/**
 * Parses and sends a chord progression with chords separated by space or with an alias
 * @param message Command arguments (chords or alias)
 * @param channels Target MIDI channel for the virtual MIDI device
 * @param type 'sendloop' or 'sendchord'
 */
export async function sendchord(message: string, channels: number): Promise<void> {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    // Lookup previously saved chord progressions
    const rawChordProgression = getChordProgression(message);

    // If a chord progression is requested, we clear the loop queue
    if (isQueueEmpty('sendchord')) {
        clearQueue('sendloop');
    }
    const myTurn = queue(rawChordProgression, 'sendchord');

    await _triggerChordList(rawChordProgression, channels, 'sendchord', myTurn);

    // Once the chord queue is empty, we go back to the loop queue
    if (isQueueEmpty('sendchord')) {
        rollbackClearQueue('sendloop');
    }
}

/**
 * Parses and sends a chord progression as a loop with chords separated by space or with an alias
 * @param message Command arguments (chords or alias)
 * @param targetMidiChannel Target MIDI channel for the virtual MIDI device
 */
export async function sendloop(message: string, targetMidiChannel: number): Promise<void> {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    const chordProgression = getChordProgression(message);

    // Queue chord progression petition
    const myTurn = queue(chordProgression, 'sendloop');

    do {
        // Execute at least once to wait for your turn in the queue
        await _triggerChordList(chordProgression, targetMidiChannel, 'sendloop', myTurn);
    } while (myTurn === currentTurnMap.sendloop);
}

/**
 * Obtains the list of chord progressions saved and returns it
 * @return List of chord progressions with their respective alias
 */
export function chordlist(): Array<[aliasName: string, chordList: string]> {
    return Object.entries(ALIASES_DB.value?.chordProgressions ?? {});
}

/**
 * Obtains the list of Control Change (CC) actions saved and returns it
 * @return List of Control Change (CC) actions aliases
 */
export function cclist(): string[] {
    return Object.keys(ALIASES_DB.value?.ccCommands ?? {});
}

/**
 * Saves a chord progresion with an alias to be used later
 * @param message Command arguments (alias/chords)
 */
export async function addchord(message: string): Promise<void> {
    const [alias, chordProgression] = message.split(GLOBAL.SLASH_SEPARATOR);
    const insertStatus = ALIASES_DB.insertUpdate(CHORD_PROGRESSIONS, { [alias.toLowerCase()]: chordProgression });
    if (insertStatus === ResponseStatus.Error) {
        throw new Error(ERROR_MSG.CHORD_PROGRESSION_BAD_INSERTION);
    }
    await ALIASES_DB.commit();
}

/**
 * Removes a chord progression saved with an alias
 * @param message Command arguments (alias)
 */
export async function removechord(message: string): Promise<void> {
    const parsedAlias = message.toLowerCase();
    const status = ALIASES_DB.delete(CHORD_PROGRESSIONS, parsedAlias);
    if (status === ResponseStatus.Error) {
        throw new Error(ERROR_MSG.CHORD_PROGRESSION_NOT_FOUND);
    }
    await ALIASES_DB.commit();
}

/**
 * Fetches data from the alias and rewards database, refreshing the copy in memory
 */
export async function fetchdb(): Promise<void> {
    await ALIASES_DB.fetchDB();
    await REWARDS_DB.fetchDB();
}

/**
 * Stops the MIDI loop on the next beat
 */
export function stoploop(): void {
    clearQueueList('sendchord', 'sendloop');
}

/**
 * Syncrhonizes the MIDI clock and the beat. Useful when the instruments are out-of-sync
 */
export function syncmidi(targetMIDIChannel: number): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    startClock(targetMIDIChannel, output, tempo);
}

/**
 * Stops sound, MIDI clock and MIDI loop
 */
export function fullstopmidi(targetMidiChannel: number): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    output.stop();
    output.allNotesOff(targetMidiChannel);
    stopClock();
    clearAllQueues();
}

/**
 * Sets the MIDI velocity (volume) for the chord progression/loop/note
 * @param message Command arguments (volume)
 * @return Parsed volume value
 */
export function midivolume(message: string): number {
    const value = parseInt(firstMessageValue(message));
    if (isNaN(value) || value < 0 || value > 100) {
        throw new Error(ERROR_MSG.INVALID_VOLUME);
    }
    // Convert to range 0-127
    volume = Math.floor(value * 1.27);
    return value;
}

async function _triggerChordList(rawChordProgression: string, channels: number, type: 'sendloop' | 'sendchord', myTurn: number): Promise<void> {
    // If the MIDI clock has not started yet, start it to make the chord progression sound
    if (!isClockActive()) {
        syncmidi(channels);
    }
    // Reset sync flag
    isSyncing.set(false);

    const chordProgression = processChordProgression(rawChordProgression, tempo);

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
        await _triggerNoteList(noteList, timeout, channels);
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
async function _triggerNoteList(noteList: number | string | string[], release: number, channels: number) {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    const parsedNoteList = !Array.isArray(noteList) ? [noteList] : noteList;
    for (const note of parsedNoteList) {
        output.noteOn(channels, note, volume);
    }
    await setTimeoutPromise(release);
    for (const note of parsedNoteList) {
        output.noteOff(channels, note, volume);
    }
}

/**
 * Sends a list of notes to the virtual MIDI device with a programmed delayed trigger for NoteOff
 * It differs from _triggerNoteList because this method returns instantly instead of waiting for the message to be sent
 * @param noteList Single note or list of notes
 * @param release Time between NoteOn and NoteOff
 * @param channels Target MIDI channel for the virtual MIDI device
 */
function _triggerNoteListDelay(noteList: number | string | string[], release: number, channels: number) {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    const parsedNoteList = !Array.isArray(noteList) ? [noteList] : noteList;
    const releaseTime = Math.round(release / 1_000_000);
    for (const note of parsedNoteList) {
        output.note(channels, note, volume, releaseTime);
    }
}

/**
 * Initializes the common variables
 */
function _initVariables() {
    initClockData();
    isChordInProgress.set(false);
    currentChordMode.set(undefined);
    tempo = CONFIG.DEFAULT_TEMPO;
    volume = CONFIG.DEFAULT_VOLUME;
}
