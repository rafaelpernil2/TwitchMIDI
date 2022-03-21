import NanoTimer from "nanotimer";

export async function setTimeoutPromise(timeout: number) {
    const timer = new NanoTimer();
    return new Promise(resolve => {
        timer.setTimeout(resolve, "", timeout + "n")
    });
}
