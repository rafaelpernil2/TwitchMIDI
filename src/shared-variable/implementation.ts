export class SharedVariable<T> {
    private innerValue: T;

    /**
     * Given a default value, it creates a SharedVariable instance
     * @param value Initial value
     */
    constructor(value: T) {
        this.innerValue = value;
    }

    /**
     * Retrieves the current value saved in this instance
     * @returns Value
     */
    public get(): T {
        return this.innerValue;
    }

    /**
     * Sets a new value to be saved in this instance
     * @param v Value
     */
    public set(v: T): void {
        this.innerValue = v;
    }
}
