import { CONFIG, ALIASES_DB, ERROR_MSG, GLOBAL, TOGGLE_MIDI_VALUES } from '../configuration/constants';
import { CC_CONTROLLERS } from '../database/jsondb/types';
import { removeParenthesisPart, getParenthesisValue } from '../twitch/chat/utils';

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

export function calculateTimeout(chordNoteToken: string, tempo: number): number {
    return Math.floor((60_000_000_000 * _getQuarterMultiplier(chordNoteToken)) / tempo);
}

export function calculateClockTickTimeNs(tempo: number): number {
    // ns per second * (60/tempo) = time for each hit / 24ppq => MIDI Clock
    return Math.floor(60_000_000_000 / (tempo * 24));
}

export function validateMIDIMessage(message: string | number): number {
    const parsedMessage = Number(message);
    if (isNaN(parsedMessage) || parsedMessage < 0 || parsedMessage > 127) {
        throw new Error(ERROR_MSG.BAD_CC_MESSAGE + ': ' + String(message));
    }
    return parsedMessage;
}

export function sweep(startValue: number, endValue: number, startTime: number, endTime: number, precision = 256): [value: number, time: number][] {
    const direction = startValue <= endValue ? 1 : -1;
    const timeStepSize = Math.abs(endTime - startTime) / precision;
    const valueStepSize = Math.abs(endValue - startValue) / precision;
    const result: Array<[value: number, time: number]> = [];
    for (let index = 1; index <= precision; index++) {
        const value = Math.floor(startValue + valueStepSize * index * direction);
        const time = Math.floor(startTime + timeStepSize * index);
        result.push([value, time]);
    }
    return result;
}

export function validateControllerMessage(ccCommand: string): [controller: number, value: number, time: number] {
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

export function parseNote(note: string): string {
    const preparedNote = removeParenthesisPart(note);
    const lastChar = preparedNote.charAt(preparedNote.length - 1);
    const octave = isNaN(Number(lastChar)) ? CONFIG.DEFAULT_OCTAVE : '';
    return preparedNote + octave;
}

function _getQuarterMultiplier(chordNoteToken: string): number {
    return Number(chordNoteToken.substring(chordNoteToken.indexOf(GLOBAL.OPEN_PARENTHESIS_SEPARATOR) + 1, chordNoteToken.indexOf(GLOBAL.CLOSE_PARENTHESIS_SEPARATOR))) || 4;
}
