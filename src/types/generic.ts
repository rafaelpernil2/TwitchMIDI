export enum ResponseStatus {
    Ok,
    Error
}

export type Result<T> = [value: T, status: ResponseStatus];

export type CustomObject<Type> = {
    [Property in keyof Type]: Type[Property];
};
