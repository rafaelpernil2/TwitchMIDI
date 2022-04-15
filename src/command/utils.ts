import { inlineChord } from 'harmonics';
import { ALIASES_DB, Command, COMMAND_VALUES, CONFIG, ERROR_MSG, GLOBAL, TOGGLE_MIDI_VALUES } from '../configuration/constants';
import { CHORD_PROGRESSIONS, CC_COMMANDS, CC_CONTROLLERS } from '../database/jsondb/types';
import { CCCommand } from './types';

/**
 *  MESSAGE METHODS
 */

/**
 * Checks if a command is in the list of defined commands and aliases
 * @param message
 * @returns
 */
export function isValidCommand(message: string): message is Command {
    return COMMAND_VALUES[message] != null;
}

/**
 * Obtains a command from chat message
 * @param message
 * @returns
 */
export function getCommand(message: string): Command | undefined {
    const command = message.slice(1).split(GLOBAL.SPACE_SEPARATOR)[0].toLowerCase();
    return message.startsWith(GLOBAL.EXCLAMATION_TOKEN) && isValidCommand(command) ? command : undefined;
}

/**
 * Splits message arguments separated by space
 * @param message
 * @returns
 */
export function splitMessageArguments(message: string): string[] {
    return message.split(GLOBAL.SPACE_SEPARATOR).filter((value) => value != '');
}

/**
 * Retrieves value between parenthesis
 * @param message
 * @returns
 */
export function getParenthesisValue(message: string): string {
    return message.substring(message.indexOf(GLOBAL.OPEN_PARENTHESIS_SEPARATOR) + 1, message.indexOf(GLOBAL.CLOSE_PARENTHESIS_SEPARATOR));
}

/**
 * Returns command arguments
 * @param message
 * @returns
 */
export function getArguments(message: string): string {
    return message.substring(message.indexOf(GLOBAL.SPACE_SEPARATOR) + 1);
}

/**
 * Returns the first argument
 * @param message
 * @returns
 */
export function firstMessageValue(message: string): string {
    return message.split(GLOBAL.SPACE_SEPARATOR)[0];
}

/**
 * Removes the content between parenthesis (if it is at the end of the token)
 * @param message
 * @returns
 */
export function removeParenthesisPart(message: string): string {
    return message.split(GLOBAL.OPEN_PARENTHESIS_SEPARATOR)[0];
}

/**
 *  MIDI METHODS
 */

/**
 * Validates a MIDI channel value (1-16 with offset 1 or 0-15 with offset 0)
 * Throws an error if the value is invalid
 * @param message Possible MIDI channel
 * @param offset Start from 0 or start from 1
 * @returns Valid MIDI channel
 */
export function validateMIDIChannel(message: string | number, offset: 1 | 0 = 1): number {
    const parsedMessage = Number(message);
    if (isNaN(parsedMessage) || parsedMessage < 0 + offset || parsedMessage > 15 + offset) {
        throw new Error(ERROR_MSG.BAD_CC_MESSAGE + ': ' + String(message));
    }
    return parsedMessage - offset;
}

/**
 * Validates a MIDI message value (0-127)
 * Throws an error if the value is invalid
 * @param message Possible MIDI value
 * @returns
 */
export function validateMIDIMessage(message: string | number): number {
    const parsedMessage = Number(message);
    if (isNaN(parsedMessage) || parsedMessage < 0 || parsedMessage > 127) {
        throw new Error(ERROR_MSG.BAD_CC_MESSAGE + ': ' + String(message));
    }
    return parsedMessage;
}

/**
 *  CHORD/NOTE METHODS
 */

/**
 * Parses a chord and converts it to "harmonics" module syntax
 * @param chord Chord to parse
 * @returns Parsed chord
 */
export function parseChord(chord: string): string {
    const parsedChord = removeParenthesisPart(chord);
    if (parsedChord.length === 0) {
        return '';
    }
    // If only a note is provided, it will be transformed into a major chord (e.g CM, EbM...)
    if (parsedChord.length === 1 || (parsedChord.length === 2 && (parsedChord.includes('b') || parsedChord.includes('#')))) {
        return parsedChord + 'M';
    }
    // If "min" is used to represent a minor chord, it will be converted to harmonics syntax "m"
    if (parsedChord.includes('min')) {
        const [pre, post] = parsedChord.split('min');
        return pre + 'm' + post;
    }
    // If a 9,7 or 6 chord is provided but without "th", it will be converted to harmonics syntax "th"
    if (
        ['9', '7', '6'].includes(parsedChord.charAt(parsedChord.length - 1)) &&
        (parsedChord.length < 3 || (parsedChord.length === 3 ? parsedChord.includes('b') || parsedChord.includes('#') : false))
    ) {
        return parsedChord + 'th';
    }
    // Default
    return parsedChord;
}

/**
 * Parses a note that may or may not contain a MIDI octave at the end
 * @param note Note to parse
 * @returns Valid MIDI note
 */
export function parseNote(note: string): string {
    const preparedNote = removeParenthesisPart(note);
    const lastChar = preparedNote.charAt(preparedNote.length - 1);
    const octave = isNaN(Number(lastChar)) ? CONFIG.DEFAULT_OCTAVE : '';
    return preparedNote + octave;
}

/**
 * Parses a message and generates a list of notes
 * @param message Command arguments (list of notes)
 * @param tempo Tempo
 * @returns List of [note,timeout] tuples
 */
export function parseNoteList(message: string, tempo: number): Array<[note: string, timeout: number]> {
    const noteList = splitMessageArguments(message);
    return noteList.map<[note: string, timeout: number]>((note) => [parseNote(note), calculateTimeout(note, tempo)]);
}

/**
 * Looks up a chord progression/loop or returns the original message if not found
 * @param message Command arguments (alias or chord progression)
 * @returns Chord progression
 */
export function getChordProgression(message: string): string {
    const aliasToLookup = message.toLowerCase();
    const chordProgression = ALIASES_DB.select(CHORD_PROGRESSIONS, aliasToLookup) ?? message;
    // Check everything is okay
    _validateChordProgression(chordProgression);
    return chordProgression;
}

/**
 * Processes a chord progression string to be played in a 4/4 beat
 * @param chordProgression Chord progression separated by spaces
 * @return List of notes to play with their respective release times
 */
export function processChordProgression(chordProgression: string, tempo: number): Array<[noteList: string[], timeout: number]> {
    const chordProgressionList = splitMessageArguments(chordProgression);

    const lastChordIndex = chordProgressionList.length - 1;
    return chordProgressionList.map((chord, index) => {
        try {
            // If it is the last, reduce the note length to make sure the loop executes properly
            const multiplier = index !== lastChordIndex ? 1 : 0.8;
            return [inlineChord(parseChord(chord)), Math.round(calculateTimeout(chord, tempo) * multiplier)];
        } catch (error) {
            throw new Error(ERROR_MSG.INVALID_CHORD(chord));
        }
    });
}

/**
 * Validates a chord progression string to be played in a 4/4 beat
 * @param chordProgression Chord progression separated by spaces
 * @return List of notes to play with their respective release times
 */
function _validateChordProgression(chordProgression: string): void {
    const chordProgressionList = splitMessageArguments(chordProgression);
    for (let index = 0; index < chordProgressionList.length; index++) {
        const chord = chordProgressionList[index];
        try {
            inlineChord(parseChord(chord));
        } catch (error) {
            throw new Error(ERROR_MSG.INVALID_CHORD(chord));
        }
    }
    return;
}

/**
 * Obtains how many quarter notes should the note/chord last
 * @param chordNoteToken Chord or Note
 * @returns Quarter note amount
 */
function _getQuarterMultiplier(chordNoteToken: string): number {
    return Number(chordNoteToken.substring(chordNoteToken.indexOf(GLOBAL.OPEN_PARENTHESIS_SEPARATOR) + 1, chordNoteToken.indexOf(GLOBAL.CLOSE_PARENTHESIS_SEPARATOR))) || 4;
}

/**
 *  CONTROL CHANGE METHODS
 */

/**
 * Retrieves a set of CC commands saved for an alias or splits the one sent
 * @param message Alias or CC commands
 * @return List of parsed CC Commands
 */
export function getCCCommandList(message: string): CCCommand[] {
    const aliasToLookup = message.toLowerCase();
    const ccCommandList = ALIASES_DB.select(CC_COMMANDS, aliasToLookup) ?? message.split(GLOBAL.COMMA_SEPARATOR);
    return _parseCCCommandList(ccCommandList);
}

/**
 * Processes a set of CC commands to be sent with their respective delays and calculating intermediary values (sweep)
 * @param rawCCCommandList List of CC commands
 * @param precision The amoutn of steps for sweeps
 * @return List of processed CC commands
 */
export function processCCCommandList(rawCCCommandList: CCCommand[], precision = CONFIG.DEFAULT_SWEEP_PRECISION): Array<CCCommand> {
    if (rawCCCommandList.length < 1) {
        throw new Error(ERROR_MSG.BAD_CC_MESSAGE);
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
 * Validates a control change message and parses it into a tuple with [controller, value, time]
 * If the validation fails, it throws an error
 * @param ccCommand CC command to parse
 * @returns Parsed command
 */
export function validateCCMessage(ccCommand: string): [controller: number, value: number, time: number] {
    const [rawController, rawValue] = ccCommand.split(GLOBAL.SPACE_SEPARATOR);

    const preparedController = rawController.replace(GLOBAL.CC_CONTROLLER, '').toLowerCase();
    const parsedController = ALIASES_DB.select(CC_CONTROLLERS, preparedController) ?? preparedController;

    const controller = validateMIDIMessage(parsedController);

    // Parse toggle values (on/off)
    const preparedValue = removeParenthesisPart(rawValue).toLowerCase();
    const parsedValue = TOGGLE_MIDI_VALUES[preparedValue] ?? preparedValue;

    const value = validateMIDIMessage(parsedValue);
    const time = Number(getParenthesisValue(rawValue) || '0'); // Time to add in ms

    return [controller, value, time];
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
    return sweep(preValue, postValue, preTime, postTime, precision).map<CCCommand>(([value, time]) => [postController, value, time]);
}

/**
 * Validates a list of CC commands
 * @param ccCommandList List of CC commands
 * @param precision The amoutn of steps for sweeps
 * @return List of processed CC commands
 */
function _parseCCCommandList(ccCommandList: string[]): CCCommand[] {
    if (ccCommandList.length < 1) {
        throw new Error(ERROR_MSG.BAD_CC_MESSAGE);
    }
    return ccCommandList.map(validateCCMessage);
}

/**
 *  TIME METHODS
 */

/**
 * Calculates the length of a determined amount of quarter notes in a particular tempo
 * @param chordNoteToken Chord or note from which to extract the quarter note amount
 * @param tempo Tempo to check against
 * @returns Length in nanoseconds
 */
export function calculateTimeout(chordNoteToken: string, tempo: number): number {
    return Math.round((60_000_000_000 * _getQuarterMultiplier(chordNoteToken)) / tempo);
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
export function sweep(startValue: number, endValue: number, startTime: number, endTime: number, precision = CONFIG.DEFAULT_SWEEP_PRECISION): Array<[value: number, time: number]> {
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
