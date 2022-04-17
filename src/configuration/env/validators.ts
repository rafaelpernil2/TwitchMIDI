import { ERROR_MSG } from '../constants';

/**
 * Validates TARGET_MIDI_CHANNEL to make sure the MIDI channel is valid
 * @param value
 * @returns If it's valid
 */
export function TARGET_MIDI_CHANNEL(value: string): boolean {
    _validateMIDIChannel(value);
    return true;
}

/**
 * Validates a MIDI channel value that must be between 1 and 16 (inclusive)
 * Throws an error if the value is invalid
 * @param message Possible MIDI channel
 * @returns
 */
function _validateMIDIChannel(message: string | number): void {
    const parsedMessage = Number(message);
    if (isNaN(parsedMessage) || parsedMessage < 1 || parsedMessage > 16) {
        throw new Error(ERROR_MSG.BAD_MIDI_CHANNEL + ' // Your value was: ' + String(message));
    }
}
