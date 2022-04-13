/**
 * Checks if the argument is an empty object
 * @param obj
 * @returns
 */
export function isEmptyObject(obj: object): boolean {
    // because Object.keys(new Date()).length === 0;
    // we have to do some additional check
    return (
        obj && // 👈 null and undefined check
        Object.keys(obj).length === 0 &&
        Object.getPrototypeOf(obj) === Object.prototype
    );
}

/**
 * Convert a string to a boolean
 * @param value
 * @returns
 */
export function getBooleanByString(value: string): boolean {
    return value.toLowerCase() === 'true' || value.toUpperCase() === 'Y';
}

/**
 * Convert a list of strings to booleans
 * @param valueList
 * @returns
 */
export function getBooleanByStringList(...valueList: string[]): boolean[] {
    return valueList.map(getBooleanByString);
}

/**
 * Checks if a string is a valid JSON
 * @param str
 * @returns
 */
export function isJsonString(str: string): boolean {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

/**
 * Removes duplicates in array
 * @param list
 * @returns
 */
export function removeDuplicates<T>(list: T[]): T[] {
    return [...new Set(list)];
}
