export class SharedVariable<T> {
    private innerValue: T | undefined;
    constructor(value?: T) {
        this.innerValue = value;
    }

    public get(): T | undefined {
        return this.innerValue;
    }

    public set(v: T | undefined) {
        this.innerValue = v;
    }
}
