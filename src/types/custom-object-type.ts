export type CustomObject<Type> = {
    [Property in keyof Type]: Type[Property];
};