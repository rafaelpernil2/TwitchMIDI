export class SharedVariable<T> {
    private _innerValue: T;

    /**
     * Given a default value, it creates a SharedVariable instance
     * @param value Initial value
     */
    constructor(value: T) {
        this._innerValue = value;
    }

    /**
     * Retrieves the current value saved in this instance
     * @returns Value
     */
    public get(): T {
        return this._innerValue;
    }

    /**
     * Sets a new value to be saved in this instance
     * @param v Value
     */
    public set(v: T): void {
        this._innerValue = v;
    }

    /**
     * Evaluates if a value is the same as the one stored in the instance
     * @param v Value
     * @returns Is equals
     */
    public is(v: T): boolean {
        return this._innerValue === v;
    }
}
