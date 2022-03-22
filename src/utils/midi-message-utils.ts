import { ERROR_MSG, GLOBAL } from '../constants/constants';
import { removeParenthesisPart, getParenthesisValue } from './message-utils';

export function parseChord(chord: string): string {
    const parsedChord = removeParenthesisPart(chord);
    if (parsedChord.length === 0) {
        return '';
    }
    if (parsedChord.length === 1 || (parsedChord.length === 2 && (parsedChord.includes('b') || parsedChord.includes('#')))) {
        return parsedChord + 'M';
    }
    if (parsedChord.includes('min')) {
        const [pre, post] = parsedChord.split('min');
        return pre + 'm' + post;
    }
    if (
        ['9', '7', '6'].includes(parsedChord.charAt(parsedChord.length - 1)) &&
        (parsedChord.length < 3 || (parsedChord.length === 3 ? parsedChord.includes('b') || parsedChord.includes('#') : false))
    ) {
        return parsedChord + 'th';
    }
    return parsedChord;
}

export function calculateTimeout(chordNoteToken: string, tempo: number): number {
    return Math.floor((60_000_000_000 * _getQuarterMultiplier(chordNoteToken)) / tempo);
}

export function calculateClockTickTimeNs(tempo: number): number {
    // ns per second * (60/tempo) = time for each hit / 24ppq => MIDI Clock
    return Math.floor(60_000_000_000 / (tempo * 24));
}

export function validateMIDIMessage(message: string): number {
    const parsedMessage = Number(message);
    if (isNaN(parsedMessage) || parsedMessage < 0 || parsedMessage > 127) {
        throw new Error(ERROR_MSG.BAD_CC_MESSAGE + ': ' + message);
    }
    return parsedMessage;
}

export function sweep(startValue: number, endValue: number, timeLapse: number, precision = 128): [value: number, time: number][] {
    const direction = startValue <= endValue ? 1 : -1;
    const timeStepSize = timeLapse / precision;
    const valueStepSize = Math.abs(endValue - startValue) / precision;
    const result: Array<[value: number, time: number]> = [];
    for (let index = 1; index <= precision; index++) {
        const value = Math.floor(startValue + valueStepSize * index * direction);
        const time = Math.floor(timeStepSize * index);
        result.push([value, time]);
    }
    return result;
}

export function validateControllerMessage(ccCommand: string): [controller: number, value: number, time: number] {
    const [rawController, rawValue] = ccCommand.split(GLOBAL.SPACE_SEPARATOR);

    const controller = validateMIDIMessage(rawController.replace(GLOBAL.CC_CONTROLLER, ''));
    const value = validateMIDIMessage(removeParenthesisPart(rawValue));
    const time = Number(getParenthesisValue(rawValue) || '0'); // Time to add in ms

    return [controller, value, time];
}

function _getQuarterMultiplier(chordNoteToken: string): number {
    return Number(chordNoteToken.substring(chordNoteToken.indexOf(GLOBAL.OPEN_PARENTHESIS_SEPARATOR) + 1, chordNoteToken.indexOf(GLOBAL.CLOSE_PARENTHESIS_SEPARATOR))) || 4;
}
