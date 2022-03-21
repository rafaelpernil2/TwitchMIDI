// import { setTimeoutPromise } from "../utils/promise-utils";
import NanoTimer from "nanotimer";
import * as harmonics from "harmonics";
import { setTimeoutPromise } from "../utils/promise-utils";
import { Input, Output, WebMidi } from "webmidi";
import { JSONDatabase } from "../providers/jsondb-provider";
import { AliasesType } from "../types/aliases-type";
import { ResponseStatus } from "../types/status-type";
import EventEmitter from "events";
export let input: Input | undefined;
export let output: Output | undefined;
export let tempo = 120;
const timer = new NanoTimer();
let loopActiveId = "";
let chordProgressionActive = false;
let tick = 0;
let volume = 0.8;
const aliasesDB = new JSONDatabase<AliasesType>("./config/aliases.json");
// I use Node.js events for notifying when the beat start is ready
const myEmitter = new EventEmitter();

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
    tempo = parseInt(firstMessageValue(message));
    //ns per second * (60/tempo) = time for each hit / 24ppq => MIDI Clock
    const clockTickTimeNs = Math.floor(60_000_000_000 / (tempo * 24));
    syncMidi();
    midiClock(output, clockTickTimeNs);

    return tempo;
}

export async function sendMIDIChord(channel: string, message: string, channels: number, { loopMode = false } = {}): Promise<void> {
    if (input == null || output == null) {
        throw new Error("Bad MIDI connection. Try !midion first");
    }
    if (!loopMode) {
        loopActiveId = "";
    }

    // Lookup previously saved chord progressions
    const parsedMessage = getCommandContent(message);
    const chordProgressionString = loopMode ? loopActiveId : (aliasesDB.select("chordProgressions", parsedMessage.toLowerCase()) ?? parsedMessage);
    const chordProgression = chordProgressionString.split(" ");

    // Data preparation
    const parsedChordProgression: Array<[string[], number]> = chordProgression.map((chord, index) => {
        try {
            const parsedChord = parseChord(chord);
            const parsedChordNotes = harmonics.inlineChord(parsedChord);
            const parsedTimeFigure = Number(getTimeFigure(chord)) || 4;
            const timeout = calculateTimeout(parsedTimeFigure);
            // If it is the last, reduce the note length to make sure the loop executes properly
            const totalTimeout = index === chordProgression.length - 1 ? timeout * 0.92 : timeout;
            return [parsedChordNotes, totalTimeout]
        } catch (error) {
            throw new Error("There is at least one invalid chord or the alias was not found: " + chord)
        }
    });

    // Here we play the chords
    await barStart();

    chordProgressionActive = true;
    for (let index = 0; index < parsedChordProgression.length; index++) {
        const [parsedChordNotes, timeout] = parsedChordProgression[index];
        output.sendNoteOn(parsedChordNotes, { attack: volume, channels })
        await setTimeoutPromise(timeout);
        output.sendNoteOff(parsedChordNotes, { channels })
    }
    chordProgressionActive = false;
}

export async function sendMIDINote(channel: string, message: string, channels: number): Promise<void> {
    if (input == null || output == null) {
        throw new Error("Bad MIDI connection. Try !midion first");
    }

    const note = firstMessageValue(message);
    const parsedTimeFigure = Number(getTimeFigure(note)) || 4;
    const parsedNote = removeTimeFigure(note);
    const timeout = calculateTimeout(parsedTimeFigure);


    output.sendNoteOn(parsedNote, { attack: volume, channels });
    await setTimeoutPromise(timeout);
    output.sendNoteOff(parsedNote, { channels });
}

export async function sendMIDILoop(channel: string, message: string, targetMidiChannel: number): Promise<void> {

    // Save chordProgression as loopActiveId
    const parsedMessage = getCommandContent(message);
    const chordProgressionString = (aliasesDB.select("chordProgressions", parsedMessage.toLowerCase()) ?? parsedMessage);
    loopActiveId = chordProgressionString;

    while (loopActiveId === chordProgressionString) {
        await sendMIDIChord(channel, message, targetMidiChannel, { loopMode: true });
    }
}

export async function getChordList(): Promise<[string, string][]> {
    return Object.entries(aliasesDB.value?.chordProgressions ?? {});
}

export async function addChordAlias(channel: string, message: string): Promise<void> {
    const [alias, chordProgression] = message.split("/");
    const parsedAlias = alias.substring(alias.indexOf(" ") + 1);
    const [status] = aliasesDB.insert("chordProgressions", { [parsedAlias.toLowerCase()]: chordProgression });
    if (status === ResponseStatus.Error) {
        throw new Error("Chord progression/loop could not be inserted")
    }
    await aliasesDB.commit();
}

export async function removeChordAlias(channel: string, message: string): Promise<void> {
    const parsedAlias = getCommandContent(message).toLowerCase();
    const status = aliasesDB.delete("chordProgressions", parsedAlias)
    if (status === ResponseStatus.Error) {
        throw new Error("Chord progression/loop not found")
    }
    await aliasesDB.commit();
}

export function stopMIDILoop(): void {
    loopActiveId = "";
}

export function setVolume(message: string): number {
    const value = parseInt(firstMessageValue(message));
    if (isNaN(value) || value < 0 || value > 100) {
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
    return new Promise(resolve => {
        const listener = () => {
            resolve();
            myEmitter.removeListener("barLoopChange", listener);
        }
        myEmitter.on("barLoopChange", listener)
    });
}

function getCommandContent(message: string): string {
    return message.substring(message.indexOf(" ") + 1)
}

function firstMessageValue(message: string): string {
    return message.split(" ")[1];
}

function getTimeFigure(message: string): string {
    return message.substring(message.indexOf("(") + 1, message.indexOf(")"));
}

function removeTimeFigure(message: string): string {
    return message.split("(")[0];
}

function parseChord(chord: string): string {
    const parsedChord = removeTimeFigure(chord);
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

function calculateTimeout(timeFigure: number): number {
    return Math.floor((60_000_000_000 * timeFigure) / tempo)
}

async function midiClock(output: Output, clockTickTimeNs: number) {
    timer.clearInterval();
    timer.setInterval(() => {
        output.sendClock();
        if (tick === 0 && !chordProgressionActive) {
            myEmitter.emit('barLoopChange', tick, chordProgressionActive);
        }
        tick = (tick + 1) % 96; // 24ppq * 4 quarter notes
    }, "", clockTickTimeNs + "n")
}