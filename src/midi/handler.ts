import NanoTimer from 'nanotimer';
import { inlineChord } from 'harmonics';
import { setTimeoutPromise } from '../utils/promise';
import * as JZZ from 'jzz';
import { JZZTypes } from '../custom-typing/jzz';
import { CC_COMMANDS, CHORD_PROGRESSIONS } from '../database/jsondb/types';
import { ResponseStatus } from '../database/interface';
import { parseChord, parseNote, calculateTimeout, calculateClockTickTimeNs, validateControllerMessage, sweep } from './utils';
import { ALIASES_DB, CONFIG, ERROR_MSG, EVENT, EVENT_EMITTER, GLOBAL, REWARDS_DB } from '../configuration/constants';
import { firstMessageValue, splitMessageArguments } from '../twitch/chat/utils';
import { CCCommand } from './types';
import { NanoTimerProperties } from '../custom-typing/nanotimer';
import { clearQueue, next, isMyTurn, queue, clearQueueList, clearAllQueues, currentTurnMap, isQueueEmpty, rollbackClearQueue } from './queue';

// Closure variables
let timer = new NanoTimer();
let output: ReturnType<JZZTypes['openMidiOut']> | undefined;
let tempo: number;
let chordProgressionActive: boolean;
let tick: number;
let volume: number;
let isSyncing = false;
let activeMode: 'sendchord' | 'sendloop';
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
        await output?.close();
        output = undefined;
        timer = new NanoTimer();
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
export function miditempo(targetMIDIChannel: number, message: string): number {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    tempo = parseInt(firstMessageValue(message));

    // Generates a MIDI clock
    _midiClock(targetMIDIChannel, output, calculateClockTickTimeNs(tempo));

    return tempo;
}

/**
 * Sends a particular CC Message, a list of CC messages separated by comma or a set of commands using an alias
 * @param message Command arguments (cc message or alias)
 * @param channels Target MIDI channel for the virtual MIDI device
 * @return A list of the messages sent
 */
export function sendcc(message: string, channels: number): Array<[key: number, value: number, time: number]> {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }

    const ccCommandList = _getCCCommandList(message);
    const processedCommandList = _processCCCommandList(ccCommandList);

    for (const [controller, value, time] of processedCommandList) {
        output.wait(time).control(channels, controller, value);
    }

    return ccCommandList.map(validateControllerMessage);
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
    const chordProgression = _getChordProgression(message);
    // Validate data
    _processChordProgression(chordProgression);

    // If a chord progression is requested, we clear the loop queue
    if (isQueueEmpty('sendchord')) {
        clearQueue('sendloop');
    }
    const myTurn = queue(chordProgression, 'sendchord');

    await _triggerChordList(chordProgression, channels, 'sendchord', myTurn);

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
    const chordProgression = _getChordProgression(message);
    // Validate data
    _processChordProgression(chordProgression);

    // Queue chord progression petition
    const turn = queue(chordProgression, 'sendloop');

    do {
        // Execute at least once to wait for your turn in the queue
        await _triggerChordList(chordProgression, targetMidiChannel, 'sendloop', turn);
    } while (turn === currentTurnMap.sendloop);
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
    _midiClock(targetMIDIChannel, output, calculateClockTickTimeNs(tempo));
}

/**
 * Stops sound, MIDI clock and MIDI loop
 */
export function fullstopmidi(targetMidiChannel: number): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    clearAllQueues();
    tick = 0;
    output.stop();
    output.allNotesOff(targetMidiChannel);
    timer.clearInterval();
    timer = new NanoTimer();
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

async function _triggerChordList(chordProgression: string, channels: number, type: 'sendloop' | 'sendchord', myTurn: number): Promise<void> {
    // If the MIDI clock has not started yet, start it to make the chord progression sound
    if (!_isClockActive()) {
        syncmidi(channels);
    }
    // Reset sync flag
    isSyncing = false;

    const processedChordProgression = _processChordProgression(chordProgression);

    // We wait until the bar starts and is your turn
    await isMyTurn(myTurn, type);
    activeMode = type;

    // Blocking section
    chordProgressionActive = true;
    for (const [noteList, timeout] of processedChordProgression) {
        // Skip iteration if tempo or sync changes
        if (isSyncing) {
            continue;
        }
        await _triggerNoteList(noteList, timeout, channels);
    }
    // Check if there is a next loop to activate
    next(type);
    chordProgressionActive = false;
}

function _isClockActive(): boolean {
    return (timer as NanoTimerProperties).intervalTime != null;
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
    const releaseTime = Math.floor(release / 1_000_000);
    for (const note of parsedNoteList) {
        output.note(channels, note, volume, releaseTime);
    }
}

/**
 * MIDI Clock: Sends ticks synced with tempo at 24ppq following MIDI spec
 * Formula: ((1_000_000_000 ns/s) * 60 seconds/minute / beats/minute(BPM) / 24ppq (pulses per quarter))
 * @param targetMIDIChannel Target MIDI channel
 * @param output VirtualMIDI device
 * @param clockTickTimeNs Clock time in nanoseconds
 */
function _midiClock(targetMIDIChannel: number, output: ReturnType<JZZTypes['openMidiOut']>, clockTickTimeNs: number): void {
    _resetClock(targetMIDIChannel, output);

    // First tick
    _sendFirstTick(output);

    // Next ticks
    timer.setInterval(_sendTick(output), '', String(clockTickTimeNs) + 'n');
}

function _sendTick(output: ReturnType<JZZTypes['openMidiOut']>): () => void {
    return () => {
        if (tick === 0 && !chordProgressionActive) {
            EVENT_EMITTER.emit(EVENT.BAR_LOOP_CHANGE_EVENT, activeMode);
        }
        output.clock();
        tick = (tick + 1) % 96; // 24ppq * 4 quarter notes
    };
}

function _resetClock(targetMIDIChannel: number, output: ReturnType<JZZTypes['openMidiOut']>) {
    isSyncing = true;
    timer.clearInterval();
    tick = 0;
    output.stop();
    output.allNotesOff(targetMIDIChannel);
}

function _sendFirstTick(output: ReturnType<JZZTypes['openMidiOut']>): void {
    _sendTick(output)();
    output.start();
}

/**
 * Looks up a chord progression/loop or returns the original message if not found
 * @param message Command arguments (alias or chord progression)
 * @returns Chord progression
 */
function _getChordProgression(message: string): string {
    const aliasToLookup = message.toLowerCase();
    return ALIASES_DB.select(CHORD_PROGRESSIONS, aliasToLookup) ?? message;
}

/**
 * Processes a chord progression string to be played in a 4/4 beat
 * @param chordProgression Chord progression separated by spaces
 * @return List of notes to play with their respective release times
 */
function _processChordProgression(chordProgression: string): Array<[noteList: string[], timeout: number]> {
    const chordProgressionList = splitMessageArguments(chordProgression);

    const lastChordIndex = chordProgressionList.length - 1;
    return chordProgressionList.map((chord, index) => {
        try {
            // If it is the last, reduce the note length to make sure the loop executes properly
            const multiplier = index !== lastChordIndex ? 1 : 0.8;
            return [inlineChord(parseChord(chord)), Math.floor(calculateTimeout(chord, tempo) * multiplier)];
        } catch (error) {
            throw new Error(ERROR_MSG.INVALID_CHORD(chord));
        }
    });
}

/**
 * Retrieves a set of CC commands saved for an alias or splits the one sent
 * @param message Alias or CC commands
 * @return List of commands to send
 */
function _getCCCommandList(message: string): string[] {
    const aliasToLookup = message.toLowerCase();
    return ALIASES_DB.select(CC_COMMANDS, aliasToLookup) ?? message.split(GLOBAL.COMMA_SEPARATOR);
}

/**
 * Processes a set of CC commands to be sent with their respective delays and calculating intermediary values (sweep)
 * @param ccCommandList List of CC commands
 * @param precission The amoutn of steps for sweeps
 * @return List of processed CC commands
 */
function _processCCCommandList(ccCommandList: string[], precission = 256): Array<CCCommand> {
    if (ccCommandList.length < 1) {
        throw new Error(ERROR_MSG.BAD_CC_MESSAGE);
    }
    // First command
    let result: CCCommand[] = [validateControllerMessage(ccCommandList[0])];
    // Next commands
    for (let preIndex = 0, postIndex = 1; preIndex < ccCommandList.length - 1, postIndex < ccCommandList.length; preIndex++, postIndex++) {
        const [preController, preValue, preTime] = validateControllerMessage(ccCommandList[preIndex]);
        const [postController, postValue, postTime] = validateControllerMessage(ccCommandList[postIndex]);
        // If there's a sweep
        if (preController === postController && postTime - preTime !== 0) {
            result = result.concat(sweep(preValue, postValue, preTime, postTime, precission).map(([value, time]) => [postController, value, time]));
        } else {
            result = result.concat([[postController, postValue, postTime]]);
        }
    }
    return result;
}

/**
 * Initializes the common variables
 */
function _initVariables() {
    tempo = CONFIG.DEFAULT_TEMPO;
    clearAllQueues();
    chordProgressionActive = false;
    tick = 0;
    volume = CONFIG.DEFAULT_VOLUME;
}
