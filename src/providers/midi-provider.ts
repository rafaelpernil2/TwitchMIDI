// import { setTimeoutPromise } from "../utils/promise-utils";
import NanoTimer from "nanotimer";
import * as harmonics from "harmonics";
import { setTimeoutPromise } from "../utils/promise-utils";
import { Input, Output, WebMidi } from "webmidi";
export let input: Input | undefined;
export let output: Output | undefined;
export let tempo = 120;
const timer = new NanoTimer();
let loopActiveId = "";
let chordProgressionActive = false;
let tick = 0;
let volume = 0.8;

export async function initMidi(targetMIDIName: string): Promise<void> {
    try {
        await WebMidi.enable();
        console.log("WebMidi enabled!");
        // Inputs
        input = WebMidi.inputs.find(input => input.name.includes(targetMIDIName));
        output = WebMidi.outputs.find(output => output.name.includes(targetMIDIName));
    } catch (error) {
        throw new Error("MIDI not connected");
    }
}

export async function disableMidi(): Promise<void> {
    try {
        fullStop()
        await WebMidi.disable();
        input = undefined;
        output = undefined;
        console.log("WebMidi disabled!");
    } catch (error) {
        throw new Error("MIDI could not be disconnected");
    }
}

export async function setMidiTempo(channel: string, message: string): Promise<number> {
    if (input == null || output == null) {
        throw new Error("Bad MIDI connection. Try !midion first");
    }
    tempo = parseInt(message.split(" ")[1]);
    const clockTempoNs = Math.floor((1_000_000_000 * 60) / tempo / 24);
    syncMidi();
    midiClock(output, clockTempoNs);

    return tempo;
}

export async function sendMIDIChord(channel: string, message: string, { loopMode = false } = {}): Promise<void> {
    if (input == null || output == null) {
        throw new Error("Bad MIDI connection. Try !midion first");
    }
    if (!loopMode) {
        loopActiveId = "";
    }
    const chordProgression = message.split(" ").slice(1);
    const parsedChordProgression = chordProgression.map((chord) => {
        try {
            const parsedChord = parseChord(chord);
            const parsedChordNotes = harmonics.inlineChord(parsedChord);
            const parsedTimeFigure = Number(chord.substring(chord.indexOf("(") + 1, chord.indexOf(")"))) || 4;
            const timeout = (60 * 1_000_000_000 / tempo) * parsedTimeFigure;
            return { parsedChordNotes, timeout }
        } catch (error) {
            throw new Error("There is at least one invalid chord: " + chord)
        }
    });

    await barStart();

    chordProgressionActive = true;
    for (const { parsedChordNotes, timeout } of parsedChordProgression) {
        output.sendNoteOn(parsedChordNotes, { attack: volume, channels: 1 })
        await setTimeoutPromise(timeout);
        output.sendNoteOff(parsedChordNotes, { channels: 1 })
    }
    chordProgressionActive = false;
}

export async function sendMIDILoop(channel: string, message: string): Promise<void> {
    loopActiveId = message;
    while (loopActiveId === message) {
        await sendMIDIChord(channel, message, { loopMode: true });
    }
}

export function stopMIDILoop(): void {
    loopActiveId = "";
}

export function setVolume(message: string): number {
    const value = parseInt(message.split(" ")[1]);
    if (value < 0 || value > 100) {
        throw new Error("Please set a volume between 0% and 100%");
    }
    volume = value / 100;
    return value;
}

export function syncMidi(): void {
    if (input == null || output == null) {
        throw new Error("Bad MIDI connection. Try !midion first");
    }
    tick = 0;
    output.sendStop();
    output.sendStart();
}

export function fullStop(): void {
    if (input == null || output == null) {
        throw new Error("Bad MIDI connection. Try !midion first");
    }
    loopActiveId = "";
    tick = 0;
    output.sendStop();
    output.sendAllNotesOff();
    timer.clearInterval();
}

async function barStart(): Promise<void> {
    const barTimer = new NanoTimer();
    return new Promise(resolve => {
        barTimer.setInterval(() => {
            if (tick != 0 || chordProgressionActive) {
                return;
            }
            tick = 0;
            barTimer.clearInterval();
            resolve();
        }, "", "100n")
    })
}

function parseChord(chord: string): string {
    const parsedChord = chord.split("(")[0];
    if (parsedChord.length === 0) {
        return ""
    }
    if (parsedChord.length === 1 || (parsedChord.length === 2 && (parsedChord.includes("b") || parsedChord.includes("#")))) {
        return parsedChord + "M";
    }
    if (parsedChord.includes("min")) {
        const [pre, post] = parsedChord.split("min");
        return pre + "m" + post;
    }
    if (["7", "6"].includes(parsedChord.charAt(parsedChord.length - 1)) && (parsedChord.length < 3 || (parsedChord.length === 3 ? parsedChord.includes("b") || parsedChord.includes("#") : false))) {
        return parsedChord + "th"
    }

    return parsedChord;
}

async function midiClock(output: Output, clockTempoNs: number) {
    timer.clearInterval();
    timer.setInterval(() => {
        output.sendClock();
        tick = (tick + 1) % (24 * 4);
    }, "", clockTempoNs + "n")
}