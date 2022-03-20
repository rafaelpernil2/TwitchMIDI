import NanoTimer from "nanotimer";
const timer = new NanoTimer();

export async function setTimeoutPromise(timeout: number) {
    return new Promise(resolve => {
        timer.setTimeout(resolve, "", timeout + "n")
    });
}
