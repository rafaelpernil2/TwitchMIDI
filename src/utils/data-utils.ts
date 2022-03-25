export function getBooleanByString(value: string): boolean {
    return value.toLowerCase() === 'true' || value.toUpperCase() === 'Y';
}

export async function inlineTryCatch<T>(func: (...args: unknown[]) => T | Promise<T>, ...args: unknown[]): Promise<[T | undefined, unknown]> {
    try {
        return [await func(...args), undefined];
    } catch (error) {
        return [undefined, error];
    }
}

export function isJsonString(str: string): boolean {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
