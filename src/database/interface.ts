export interface Database<T extends CustomObject<T>> {
    /**
     * Retrieves the full DB data
     */
    get value(): T | undefined;

    /**
     * Sets a DB
     */
    set value(v: T | undefined);

    /**
     * Retrieves all data from path
     * @param path Path in DB
     * @returns Data in path
     */
    selectAll<P extends keyof T>(path: P): T[P] | undefined;

    /**
     * Retrieves value from path and key
     * @param path Path in DB
     * @param key Key in DB
     * @returns Data in path
     */
    select<P extends keyof T, S extends keyof T[P]>(path: P, key: S): T[P][S] | undefined;

    /**
     * Overrides data in DB[path] with a new value
     * @param path Path in DB
     * @param value New value to save
     * @returns ResponseStatus: Ok or Error
     */
    insertUpdate<P extends keyof T>(path: P, value: T[P]): ResponseStatus;

    /**
     * Removes data in DB[path][key]
     * @param path Path in DB
     * @param key Key in path
     * @returns ResponseStatus: Ok or Error
     */
    delete<P extends keyof T>(path: P, key: keyof T[P]): ResponseStatus;

    /**
     * Saves changes into the persistent DB
     * @returns Promise of ResponseStatus: Ok or Error
     */
    commit(): Promise<ResponseStatus>;

    /**
     * Clears commit data
     * @returns ResponseStatus: Ok or Error
     */
    rollback(): ResponseStatus;

    /**
     * Fetches data from persistent DB asynchronously
     */
    fetchDB(): Promise<void>;
}

export enum ResponseStatus {
    Ok,
    Error
}

type CustomObject<Type> = {
    [Property in keyof Type]: Type[Property];
};
