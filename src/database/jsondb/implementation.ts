import { Database, ResponseStatus } from '../interface';
import { promises as fs, readFileSync } from 'fs';

export class JSONDatabase<T> implements Database<T> {
    private filePath: string;
    private db: T | undefined;
    private dbCommit: T | undefined;

    /**
     * Given the file DB path, the contents are loaded into this.db
     * @param filePath File DB path
     */
    constructor(filePath: string) {
        this.filePath = filePath;
        this.syncFetchDB();
    }

    /**
     * Retrieves the full DB data
     */
    get value(): T | undefined {
        return this.db;
    }
    /**
     * Sets a DB
     */
    set value(newDB: T | undefined) {
        this.db = newDB;
    }

    /**
     * Retrieves all data from path
     * @param path Path in DB
     * @returns Data in path
     */
    selectAll<P extends keyof T>(path: P): T[P] | undefined {
        if (this.db == null) {
            return;
        }
        return this.db[path];
    }

    /**
     * Retrieves value from path and key
     * @param path Path in DB
     * @param key Key in DB
     * @returns Data in path
     */
    select<P extends keyof T, S extends keyof T[P]>(path: P, key: S): T[P][S] | undefined {
        if (this.db == null) {
            return;
        }
        return this.db[path]?.[key];
    }

    /**
     * Inserts data in DB[path][key] and throws an error if the same key exists
     * @param path Path in DB
     * @param key Key in DB
     * @param value New value to save
     * @returns ResponseStatus: Ok or Error
     */
    insert<P extends keyof T, S extends keyof T[P]>(path: P, key: S, value: T[P][S]): ResponseStatus {
        if (this.dbCommit == null || this.dbCommit[path][key] != null) {
            return ResponseStatus.Error;
        }
        this.dbCommit[path][key] = value;
        return ResponseStatus.Ok;
    }

    /**
     * Overrides data in DB[path] with a new value
     * @param path Path in DB
     * @param value New value to save
     * @returns ResponseStatus: Ok or Error
     */
    upsert<P extends keyof T>(path: P, value: T[P]): ResponseStatus {
        if (this.dbCommit == null) {
            return ResponseStatus.Error;
        }
        this.dbCommit[path] = { ...this.dbCommit[path], ...value };
        return ResponseStatus.Ok;
    }

    /**
     * Removes data in DB[path][key]
     * @param path Path in DB
     * @param key Key in path
     * @returns ResponseStatus: Ok or Error
     */
    delete<P extends keyof T>(path: P, key: keyof T[P]): ResponseStatus {
        if (this.dbCommit == null || this.dbCommit?.[path]?.[key] == null) {
            return ResponseStatus.Error;
        }
        delete this.dbCommit?.[path]?.[key];
        return ResponseStatus.Ok;
    }

    /**
     * Saves changes into the persistent DB
     * @returns Promise of ResponseStatus: Ok or Error
     */
    async commit(): Promise<ResponseStatus> {
        try {
            await fs.writeFile(this.filePath, JSON.stringify(this.dbCommit, null, 4), { encoding: 'utf-8' });
            await this.fetchDB();
            return ResponseStatus.Ok;
        } catch (error) {
            return ResponseStatus.Error;
        }
    }

    /**
     * Clears commit data
     * @returns ResponseStatus: Ok or Error
     */
    rollback(): ResponseStatus {
        this.dbCommit = JSON.parse(JSON.stringify(this.db)) as T;
        return ResponseStatus.Ok;
    }

    /**
     * Fetches data from persistent DB asynchronously
     */
    async fetchDB(): Promise<void> {
        this.db = JSON.parse(await fs.readFile(this.filePath, { encoding: 'utf-8' })) as T;
        this.dbCommit = JSON.parse(JSON.stringify(this.db)) as T;
    }

    /**
     * Fetches data from persistent DB synchronously
     */
    syncFetchDB(): void {
        this.db = JSON.parse(readFileSync(this.filePath, { encoding: 'utf-8' })) as T;
        this.dbCommit = JSON.parse(JSON.stringify(this.db)) as T;
    }
}
