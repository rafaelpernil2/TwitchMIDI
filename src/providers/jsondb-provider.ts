import { Database } from '../types/databse-interface';
import { ResponseStatus } from '../types/status-type';
import { promises as fs, readFileSync } from 'fs';

export class JSONDatabase<T> implements Database<T> {
    private filePath: string;
    private db: T | undefined;
    private dbCommit: T | undefined;

    constructor(filePath: string) {
        this.filePath = filePath;
        this.syncFetchDB();
    }

    get value(): T | undefined {
        return this.db;
    }
    set value(newDB: T | undefined) {
        this.db = newDB;
    }

    selectAll<P extends keyof T>(path: P): T[P] | undefined {
        if (this.db == null) {
            return;
        }
        return this.db[path];
    }

    select<P extends keyof T, S extends keyof T[P]>(path: P, key: S): T[P][S] | undefined {
        if (this.db == null) {
            return;
        }
        return this.db[path]?.[key];
    }

    insertUpdate<P extends keyof T>(path: P, value: T[P]): ResponseStatus {
        if (this.dbCommit == null) {
            return ResponseStatus.Error;
        }
        this.dbCommit[path] = { ...this.dbCommit[path], ...value };
        return ResponseStatus.Ok;
    }

    delete<P extends keyof T>(path: P, key: keyof T[P]): ResponseStatus {
        if (this.dbCommit == null || this.dbCommit?.[path]?.[key] == null) {
            return ResponseStatus.Error;
        }
        delete this.dbCommit?.[path]?.[key];
        return ResponseStatus.Ok;
    }

    async commit(): Promise<ResponseStatus> {
        try {
            await fs.writeFile(this.filePath, JSON.stringify(this.dbCommit, null, 4), { encoding: 'utf-8' });
            await this.fetchDB();
            return ResponseStatus.Ok;
        } catch (error) {
            return ResponseStatus.Error;
        }
    }

    rollback(): ResponseStatus {
        this.dbCommit = JSON.parse(JSON.stringify(this.db)) as T;
        return ResponseStatus.Ok;
    }

    async fetchDB(): Promise<void> {
        this.db = JSON.parse(await fs.readFile(this.filePath, { encoding: 'utf-8' })) as T;
        this.dbCommit = JSON.parse(JSON.stringify(this.db)) as T;
    }

    syncFetchDB(): void {
        this.db = JSON.parse(readFileSync(this.filePath, { encoding: 'utf-8' })) as T;
        this.dbCommit = JSON.parse(JSON.stringify(this.db)) as T;
    }
}
