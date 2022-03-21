// import { setTimeoutPromise } from "../utils/promise-utils";
import NanoTimer from "nanotimer";
import { inlineChord } from "harmonics";
import { setTimeoutPromise } from "../utils/promise-utils";
import { Output, WebMidi } from "webmidi";
import { JSONDatabase } from "../providers/jsondb-provider";
import { AliasesType, CC_COMMANDS, CHORD_PROGRESSIONS } from "../types/aliases-type";
import { ResponseStatus } from "../types/status-type";
import EventEmitter from "events";
import { firstMessageValue, getCommandContent, parseChord, calculateTimeout, removeParenthesisPart, calculateClockTickTimeNs, validateControllerMessage, sweep } from "../utils/midi-message-utils";
import { CONFIG, ERROR_MSG, GLOBAL } from "../constants/constants";
import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage";
// Constants
const timer = new NanoTimer();
const BAR_LOOP_CHANGE_EVENT = "barLoopChange"
const aliasesDB = new JSONDatabase<AliasesType>(CONFIG.ALIASES_DB_PATH);
const barEventEmitter = new EventEmitter(); // I use Node.js events for notifying when the beat start is ready

// Closure variables
let output: Output | undefined;
let tempo: number;
let loopActiveId: string;
let chordProgressionActive: boolean;
let tick: number;
let volume: number;
_initVariables();

export async function initMidi(targetMIDIName: string): Promise<void> {
    try {
        await WebMidi.enable();
        _initVariables();
        output = WebMidi.outputs.find(output => output.name.includes(targetMIDIName));
        console.log("WebMidi enabled!");
    } catch (error) {
        throw new Error(ERROR_MSG.MIDI_CONNECTION_ERROR);
    }
}

export async function disableMidi(): Promise<void> {
    try {
        fullStop()
        await WebMidi.disable();
        output = undefined;
        console.log("WebMidi disabled!");
    } catch (error) {
        throw new Error(ERROR_MSG.MIDI_DISCONNECTION_ERROR);
    }
}

export async function setMidiTempo(channel: string, message: string): Promise<number> {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    tempo = parseInt(firstMessageValue(message));

    _midiClock(output, calculateClockTickTimeNs(tempo));

    return tempo;
}

export async function sendCCMessage(channel: string, message: string, { userInfo }: TwitchPrivateMessage, channels: number): Promise<[key: number, value: number, time: number][]> {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }

    if (!userInfo.isSubscriber && !userInfo.isBroadcaster && !userInfo.isMod) {
        throw new Error(ERROR_MSG.INSUFFICIENT_PERMISSIONS)
    }

    const ccCommandList = _getCCCommandList(message);
    const processedCommandList = _processCCCommandList(ccCommandList);

    for (const [controller, value, time] of processedCommandList) {
        output.sendControlChange(controller, value, { channels, time: WebMidi.time + time });
    }

    return ccCommandList.map(validateControllerMessage);
}

export async function sendMIDIChord(channel: string, message: string, channels: number, { loopMode = false } = {}): Promise<void> {
    // Reset on new non-looped chord progression
    if (!loopMode) {
        loopActiveId = GLOBAL.EMPTY_MESSAGE;
    }

    // Lookup previously saved chord progressions
    const chordProgression = _getChordProgression(message);
    const processedChordProgression = _processChordProgression(chordProgression);

    // Here we play the chords
    await _isBarStart();

    // Blocking section
    chordProgressionActive = true;
    for (const [noteList, timeout] of processedChordProgression) {
        await _triggerNoteList(noteList, timeout, channels)
    }
    chordProgressionActive = false;
}

export async function sendMIDINote(channel: string, message: string, channels: number): Promise<void> {
    const noteList = getCommandContent(message).split(" ");
    for (const note of noteList) {
        const parsedNote = removeParenthesisPart(note);
        const timeout = calculateTimeout(note, tempo);
        await _triggerNoteListDelay(parsedNote, timeout, channels);
    }
}

export async function sendMIDILoop(channel: string, message: string, targetMidiChannel: number): Promise<void> {
    // Save chordProgression as loopActiveId
    const chordProgression = _getChordProgression(message);
    // Process chord progression to check errors
    _processChordProgression(chordProgression);
    loopActiveId = chordProgression;

    while (loopActiveId === chordProgression) {
        await sendMIDIChord(channel, message, targetMidiChannel, { loopMode: true });
    }
}

export async function getChordList(): Promise<Array<[aliasName: string, chordList: string]>> {
    return Object.entries(aliasesDB.value?.chordProgressions ?? {});
}

export async function addChordAlias(channel: string, message: string): Promise<void> {
    const parsedMessage = getCommandContent(message);
    const [alias, chordProgression] = parsedMessage.split("/");

    const insertStatus = aliasesDB.insertUpdate(CHORD_PROGRESSIONS, { [alias.toLowerCase()]: chordProgression });

    if (insertStatus === ResponseStatus.Error) {
        throw new Error(ERROR_MSG.CHORD_PROGRESSION_BAD_INSERTION)
    }
    await aliasesDB.commit();
}

export async function removeChordAlias(channel: string, message: string): Promise<void> {
    const parsedAlias = getCommandContent(message).toLowerCase();
    const status = aliasesDB.delete(CHORD_PROGRESSIONS, parsedAlias)
    if (status === ResponseStatus.Error) {
        throw new Error(ERROR_MSG.CHORD_PROGRESSION_NOT_FOUND)
    }
    await aliasesDB.commit();
}

export function stopMIDILoop(): void {
    loopActiveId = GLOBAL.EMPTY_MESSAGE;
}

export function setVolume(message: string): number {
    const value = parseInt(firstMessageValue(message));
    if (isNaN(value) || value < 0 || value > 100) {
        throw new Error(ERROR_MSG.INVALID_VOLUME);
    }
    volume = value / 100;
    return value;
}

export function syncMidi(): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    tick = 0;
    output.sendStop();
    output.sendStart();
}

export function fullStop(): void {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    loopActiveId = GLOBAL.EMPTY_MESSAGE;
    tick = 0;
    output.sendStop();
    output.sendAllNotesOff();
    timer.clearInterval();
}

async function _triggerNoteList(noteList: number | string | string[], release: number, channels: number) {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    output.sendNoteOn(noteList, { attack: volume, channels })
    await setTimeoutPromise(release);
    output.sendNoteOff(noteList, { channels })
}

async function _triggerNoteListDelay(noteList: number | string | string[], release: number, channels: number) {
    if (output == null) {
        throw new Error(ERROR_MSG.BAD_MIDI_CONNECTION);
    }
    output.sendNoteOn(noteList, { attack: volume, channels })
    output.sendNoteOff(noteList, { channels, time: WebMidi.time + Math.floor(release / 1_000_000) })
}

async function _isBarStart(): Promise<void> {
    return new Promise(resolve => {
        const listener = () => {
            resolve();
            barEventEmitter.removeListener(BAR_LOOP_CHANGE_EVENT, listener);
        }
        barEventEmitter.on(BAR_LOOP_CHANGE_EVENT, listener)
    });
}

async function _midiClock(output: Output, clockTickTimeNs: number) {
    const sendTick = () => {
        if (tick === 0 && !chordProgressionActive) {
            barEventEmitter.emit(BAR_LOOP_CHANGE_EVENT);
        }
        output.sendClock();
        tick = (tick + 1) % 96; // 24ppq * 4 quarter notes
    };
    // First tick
    timer.clearInterval();
    syncMidi();
    sendTick();

    // Next ticks
    timer.setInterval(sendTick, "", clockTickTimeNs + "n");
}


function _getChordProgression(message: string, loopMode = false): string {
    if (loopMode) {
        return loopActiveId;
    }
    const parsedMessage = getCommandContent(message);
    const aliasToLookup = parsedMessage.toLowerCase();
    return (aliasesDB.select(CHORD_PROGRESSIONS, aliasToLookup) ?? parsedMessage);
}

function _processChordProgression(chordProgression: string): Array<[noteList: string[], timeout: number]> {
    const chordProgressionList = chordProgression.split(" ")
    const lastChordIndex = chordProgressionList.length - 1;
    return chordProgressionList.map((chord, index) => {
        try {
            // If it is the last, reduce the note length to make sure the loop executes properly
            const multiplier = index !== lastChordIndex ? 1 : 0.90;
            return [inlineChord(parseChord(chord)), Math.floor(calculateTimeout(chord, tempo) * multiplier)]
        } catch (error) {
            throw new Error(ERROR_MSG.INVALID_CHORD(chord))
        }
    });
}

function _getCCCommandList(message: string): string[] {
    const parsedMessage = getCommandContent(message);
    // Let's try to lookup values
    const aliasToLookup = parsedMessage.toLowerCase();
    return (aliasesDB.select(CC_COMMANDS, aliasToLookup) ?? [parsedMessage]);
}

type CCCommand = [controller: number, value: number, time: number];

function _processCCCommandList(ccCommandList: string[], precission = 1000): Array<CCCommand> {
    if (ccCommandList.length === 1) {
        return [validateControllerMessage(ccCommandList[0])];
    }
    let result: Array<CCCommand> = [];
    for (let preIndex = 0, postIndex = 1; preIndex < ccCommandList.length - 1, postIndex < ccCommandList.length; preIndex++, postIndex++) {
        const [preController, preValue, preTime] = validateControllerMessage(ccCommandList[preIndex]);
        const [postController, postValue, postTime] = validateControllerMessage(ccCommandList[postIndex]);
        // If there's a sweep
        const timeDiff = postTime - preTime;
        if (preController === postController && timeDiff !== 0) {
            result = [...result,
            ...sweep(preValue, postValue, timeDiff, precission).map<CCCommand>(([value, time]) => [postController, value, time])];
        }
        result = [...result, [postController, postValue, postTime]]
    }
    return result;
}

function _initVariables() {
    tempo = CONFIG.DEFAULT_TEMPO;
    loopActiveId = GLOBAL.EMPTY_MESSAGE;
    chordProgressionActive = false;
    tick = 0;
    volume = CONFIG.DEFAULT_VOLUME;
}

