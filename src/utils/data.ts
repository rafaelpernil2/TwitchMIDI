import { ERROR_MSG } from '../configuration/constants';

export function isEmptyObject(obj: object): boolean {
    // because Object.keys(new Date()).length === 0;
    // we have to do some additional check
    return (
        obj && // 👈 null and undefined check
        Object.keys(obj).length === 0 &&
        Object.getPrototypeOf(obj) === Object.prototype
    );
}

export function getBooleanByString(value: string): boolean {
    return value.toLowerCase() === 'true' || value.toUpperCase() === 'Y';
}

export function isJsonString(str: string): boolean {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

export function validateMIDIChannel(message: string | number, offset: 1 | 0 = 1): number {
    const parsedMessage = Number(message);
    if (isNaN(parsedMessage) || parsedMessage < 0 + offset || parsedMessage > 15 + offset) {
        throw new Error(ERROR_MSG.BAD_CC_MESSAGE + ': ' + String(message));
    }
    return parsedMessage - offset;
}
