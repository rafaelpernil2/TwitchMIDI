import { CustomObject } from "./custom-object-type";
import { ResponseStatus } from "./status-type";

export interface Database<T extends CustomObject<T>> {
    get value(): T | undefined;
    set value(v: T | undefined);
    select<P extends keyof T, S extends keyof T[P]>(path: P, key: S): T[P][S] | undefined
    insert<P extends keyof T>(path: P, value: T[P]): [ResponseStatus, string]
    update<P extends keyof T>(path: P, value: T[P]): ResponseStatus
    delete<P extends keyof T>(path: P, key: keyof T[P]): ResponseStatus
    commit(): Promise<ResponseStatus>
    rollback(): Promise<ResponseStatus>
}