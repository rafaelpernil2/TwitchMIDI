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

export function removeDuplicates<T>(list: T[]): T[] {
    return [...new Set(list)];
}
