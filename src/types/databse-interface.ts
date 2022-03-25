import { CustomObject } from './custom-object-type';
import { ResponseStatus } from './status-type';

export interface Database<T extends CustomObject<T>> {
    get value(): T | undefined;
    set value(v: T | undefined);
    selectAll<P extends keyof T>(path: P): T[P] | undefined;
    select<P extends keyof T, S extends keyof T[P]>(path: P, key: S): T[P][S] | undefined;
    insertUpdate<P extends keyof T>(path: P, value: T[P]): ResponseStatus;
    delete<P extends keyof T>(path: P, key: keyof T[P]): ResponseStatus;
    commit(): Promise<ResponseStatus>;
    rollback(): ResponseStatus;
    fetchDB(): Promise<void>;
}
