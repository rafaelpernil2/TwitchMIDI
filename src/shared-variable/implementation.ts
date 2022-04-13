export class SharedVariable<T> {
    private innerValue: T;
    constructor(value: T) {
        this.innerValue = value;
    }

    public get(): T {
        return this.innerValue;
    }

    public set(v: T) {
        this.innerValue = v;
    }
}
