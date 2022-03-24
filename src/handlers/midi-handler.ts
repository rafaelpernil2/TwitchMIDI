// import { setTimeoutPromise } from "../utils/promise-utils";
import NanoTimer from 'nanotimer';
import { inlineChord } from 'harmonics';
import { setTimeoutPromise } from '../utils/promise-utils';
import { Output, WebMidi } from 'webmidi';
import { JSONDatabase } from '../providers/jsondb-provider';
import { AliasesType, CC_COMMANDS, CHORD_PROGRESSIONS } from '../types/jsondb-types';
import { ResponseStatus } from '../types/status-type';
import EventEmitter from 'events';
import { parseChord, calculateTimeout, calculateClockTickTimeNs, validateControllerMessage, sweep } from '../utils/midi-message-utils';
import { CONFIG, ERROR_MSG, GLOBAL } from '../configuration/constants';
import { firstMessageValue, removeParenthesisPart, splitMessageArguments } from '../utils/message-utils';
import { CCCommand } from '../types/midi-types';

// Constants
const timer = new NanoTimer();
const BAR_LOOP_CHANGE_EVENT = 'barLoopChange';
const aliasesDB = new JSONDatabase<AliasesType>(CONFIG.ALIASES_DB_PATH);
const barEventEmitter = new EventEmitter(); // I use Node.js events for notifying when the beat start is ready

// Closure variables
let output: Output | undefined;
let tempo: number;
let loopActiveId: string;
let chordProgressionActive: boolean;
let tick: number;
let volume: number;
_initVariables();

/**
 * Initializes WebMIDI connectivity and allows the bot to work
 * @param targetMIDIName The Virtual MIDI device name set in .env
 */
export async function initMidi(targetMIDIName: string): Promise<void> {
    try {
        await WebMidi.enable();
        _initVariables();
        output = WebMidi.outputs.find((output) => output.name.includes(targetMIDIName));
        console.log('WebMidi enabled!');
    } catch (error) {
        throw new Error(ERROR_MSG.MIDI_CONNECTION_ERROR);
    }
}

/**
 * Disables WebMIDI connectivity and stops all MIDI
 */
export async function disableMidi(): Promise<void> {
    try {
        fullStop();
        await WebMidi.disable();
        output = undefined;
        console.log('WebMidi disabled!');
    } catch (error) {
        throw new Error(ERROR_MSG.MIDI_DISCONNECTION_ERROR);
    }
}

/**
 * Sets a partitular tempo and starts playing
 * @param message Command arguments (tempo)
 * @return Parsed tempo value
 */
export function setMidiTempo(message: string): number {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    tempo = parseInt(firstMessageValue(message));

    // Generates a MIDI clock
    _midiClock(output, calculateClockTickTimeNs(tempo));

    return tempo;
}

/**
 * Sends a particular CC Message, a list of CC messages separated by comma or a set of commands using an alias
 * @param message Command arguments (cc message or alias)
 * @param channels Target MIDI channel for the virtual MIDI device
 * @return A list of the messages sent
 */
export function sendCCMessage(message: string, channels: number): Array<[key: number, value: number, time: number]> {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }

    const ccCommandList = _getCCCommandList(message);
    const processedCommandList = _processCCCommandList(ccCommandList);

    for (const [controller, value, time] of processedCommandList) {
        output.sendControlChange(controller, value, { channels, time: WebMidi.time + time });
    }

    return ccCommandList.map(validateControllerMessage);
}

/**
 * Sends a set of MIDI notes separated by spaces
 * @param message Command arguments (notes)
 * @param channels Target MIDI channel for the virtual MIDI device
 */
export function sendMIDINote(message: string, channels: number): void {
    const noteList = splitMessageArguments(message);
    for (const note of noteList) {
        const timeout = calculateTimeout(note, tempo);
        const parsedNote = removeParenthesisPart(note);
        _triggerNoteListDelay(parsedNote, timeout, channels);
    }
}

/**
 * Parses and sends a chord progression with chords separated by space or with an alias
 * @param message Command arguments (chords or alias)
 * @param channels Target MIDI channel for the virtual MIDI device
 * @param { loopMode } options If active, it does not reset the loopActiveId variable
 */
export async function sendMIDIChord(message: string, channels: number, { loopMode = false } = {}): Promise<void> {
    // Reset on new non-looped chord progression
    if (!loopMode) {
        loopActiveId = GLOBAL.EMPTY_MESSAGE;
    }

    // Lookup previously saved chord progressions
    const chordProgression = _getChordProgression(message);
    const processedChordProgression = _processChordProgression(chordProgression);

    // Here we play the chords
    await _isBarStart();

    // Blocking section
    chordProgressionActive = true;
    for (const [noteList, timeout] of processedChordProgression) {
        await _triggerNoteList(noteList, timeout, channels);
    }
    chordProgressionActive = false;
}

/**
 * Parses and sends a chord progression as a loop with chords separated by space or with an alias
 * @param message Command arguments (chords or alias)
 * @param targetMidiChannel Target MIDI channel for the virtual MIDI device
 */
export async function sendMIDILoop(message: string, targetMidiChannel: number): Promise<void> {
    // Save chordProgression as loopActiveId
    const chordProgression = _getChordProgression(message);
    // Process chord progression to check errors
    _processChordProgression(chordProgression);

    loopActiveId = chordProgression;

    while (loopActiveId === chordProgression) {
        await sendMIDIChord(message, targetMidiChannel, { loopMode: true });
    }
}

/**
 * Obtains the list of chord progressions saved and returns it
 * @return List of chord progressions with their respective alias
 */
export function getChordList(): Array<[aliasName: string, chordList: string]> {
    return Object.entries(aliasesDB.value?.chordProgressions ?? {});
}

/**
 * Saves a chord progresion with an alias to be used later
 * @param message Command arguments (alias/chords)
 */
export async function addChordAlias(message: string): Promise<void> {
    const [alias, chordProgression] = message.split(GLOBAL.SLASH_SEPARATOR);
    const insertStatus = aliasesDB.insertUpdate(CHORD_PROGRESSIONS, { [alias.toLowerCase()]: chordProgression });
    if (insertStatus === ResponseStatus.Error) {
        throw new Error(ERROR_MSG.CHORD_PROGRESSION_BAD_INSERTION);
    }
    await aliasesDB.commit();
}

/**
 * Removes a chord progression saved with an alias
 * @param message Command arguments (alias)
 */
export async function removeChordAlias(message: string): Promise<void> {
    const parsedAlias = message.toLowerCase();
    const status = aliasesDB.delete(CHORD_PROGRESSIONS, parsedAlias);
    if (status === ResponseStatus.Error) {
        throw new Error(ERROR_MSG.CHORD_PROGRESSION_NOT_FOUND);
    }
    await aliasesDB.commit();
}

/**
 * Fetches data from the alias database, refreshing the copy in memory
 */
export async function fetchAliasesDB(): Promise<void> {
    await aliasesDB.fetchDB();
}

/**
 * Stops the MIDI loop on the next beat
 */
export function stopMIDILoop(): void {
    loopActiveId = GLOBAL.EMPTY_MESSAGE;
}

/**
 * Syncrhonizes the MIDI clock and the beat. Useful when the instruments are out-of-sync
 */
export function syncMidi(): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    tick = 0;
    output.sendStop();
    output.sendAllNotesOff();
    output.sendStart();
}

/**
 * Stops sound, MIDI clock and MIDI loop
 */
export function fullStop(): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    loopActiveId = GLOBAL.EMPTY_MESSAGE;
    tick = 0;
    output.sendStop();
    output.sendAllNotesOff();
    timer.clearInterval();
}

/**
 * Sets the MIDI velocity (volume) for the chord progression/loop/note
 * @param message Command arguments (volume)
 * @return Parsed volume value
 */
export function setVolume(message: string): number {
    const value = parseInt(firstMessageValue(message));
    if (isNaN(value) || value < 0 || value > 100) {
        throw new Error(ERROR_MSG.INVALID_VOLUME);
    }
    volume = value / 100;
    return value;
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
    output.sendNoteOn(noteList, { attack: volume, channels });
    await setTimeoutPromise(release);
    output.sendNoteOff(noteList, { channels });
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
    output.sendNoteOn(noteList, { attack: volume, channels });
    output.sendNoteOff(noteList, { channels, time: WebMidi.time + Math.floor(release / 1_000_000) });
}

/**
 * Resolves once the bar is starting
 * It uses Node.js Event Emitters for notifying
 * @return An empty promise
 */
async function _isBarStart(): Promise<void> {
    return new Promise((resolve) => {
        const listener = () => {
            resolve();
            barEventEmitter.removeListener(BAR_LOOP_CHANGE_EVENT, listener);
        };
        barEventEmitter.on(BAR_LOOP_CHANGE_EVENT, listener);
    });
}

/**
 * MIDI Clock: Sends ticks synced with tempo at 24ppq following MIDI spec
 * Formula: ((1_000_000_000 ns/s) * 60 seconds/minute / beats/minute(BPM) / 24ppq (pulses per quarter))
 * @param output VirtualMIDI device
 * @param clockTickTimeNs Clock time in nanoseconds
 */
function _midiClock(output: Output, clockTickTimeNs: number): void {
    const sendTick = () => {
        if (tick === 0 && !chordProgressionActive) {
            barEventEmitter.emit(BAR_LOOP_CHANGE_EVENT);
        }
        output.sendClock();
        tick = (tick + 1) % 96; // 24ppq * 4 quarter notes
    };
    // First tick
    timer.clearInterval();
    syncMidi();
    sendTick();
    // Next ticks
    timer.setInterval(sendTick, '', String(clockTickTimeNs) + 'n');
}

/**
 * Looks up a chord progression/loop or returns the original message if not found
 * @param message Command arguments (alias or chord progression)
 * @param loopMode In case of loop, it returns the current value, this avoids unnecessary queries
 * @return Chord progression
 */
function _getChordProgression(message: string, loopMode = false): string {
    if (loopMode) {
        return loopActiveId;
    }
    const aliasToLookup = message.toLowerCase();
    return aliasesDB.select(CHORD_PROGRESSIONS, aliasToLookup) ?? message;
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
            const multiplier = index !== lastChordIndex ? 1 : 0.9;
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
    return aliasesDB.select(CC_COMMANDS, aliasToLookup) ?? message.split(GLOBAL.COMMA_SEPARATOR);
}

/**
 * Processes a set of CC commands to be sent with their respective delays and calculating intermediary values (sweep)
 * @param ccCommandList List of CC commands
 * @param precission The amoutn of steps for sweeps
 * @return List of processed CC commands
 */
function _processCCCommandList(ccCommandList: string[], precission = 128): Array<CCCommand> {
    if (ccCommandList.length < 1) {
        throw new Error(ERROR_MSG.BAD_CC_MESSAGE);
    }
    // First command
    let result: CCCommand[] = [validateControllerMessage(ccCommandList[0])];
    // Next commands
    for (let preIndex = 0, postIndex = 1; preIndex < ccCommandList.length - 1, postIndex < ccCommandList.length; preIndex++, postIndex++) {
        const [preController, preValue, preTime] = validateControllerMessage(ccCommandList[preIndex]);
        const [postController, postValue, postTime] = validateControllerMessage(ccCommandList[postIndex]);
        const timeDiff = postTime - preTime;
        // If there's a sweep
        if (preController === postController && timeDiff !== 0) {
            result = result.concat(sweep(preValue, postValue, timeDiff, precission).map<CCCommand>(([value, time]) => [postController, value, time]));
            continue;
        }
        result = result.concat([[postController, postValue, postTime]]);
    }
    return result;
}

/**
 * Initializes the common variables
 */
function _initVariables() {
    tempo = CONFIG.DEFAULT_TEMPO;
    loopActiveId = GLOBAL.EMPTY_MESSAGE;
    chordProgressionActive = false;
    tick = 0;
    volume = CONFIG.DEFAULT_VOLUME;
}
