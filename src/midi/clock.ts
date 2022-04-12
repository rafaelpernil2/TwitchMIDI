import NanoTimer from 'nanotimer';
import { EVENT_EMITTER, EVENT } from '../configuration/constants';
import { JZZTypes } from '../custom-typing/jzz';
import { NanoTimerProperties } from '../custom-typing/nanotimer';
import { SharedVariable } from '../shared-variable/implementation';
import { currentChordMode, isChordInProgress } from './handler';
import { calculateClockTickTimeNs } from './utils';

// Shared variables
export const isSyncing = new SharedVariable(false);
// Clock variables
let timer = new NanoTimer();
let tick = 0;

/**
 * MIDI Clock: Sends ticks synced with tempo at 24ppq following MIDI spec
 * Formula: ((1_000_000_000 ns/s) * 60 seconds/minute / beats/minute(BPM) / 24ppq (pulses per quarter))
 * @param targetMIDIChannel Target MIDI channel
 * @param output VirtualMIDI device
 * @param clockTickTimeNs Clock time in nanoseconds
 */
export function startClock(targetMIDIChannel: number, output: ReturnType<JZZTypes['openMidiOut']>, tempo: number): void {
    _resetClock(targetMIDIChannel, output);

    // First tick
    _sendFirstTick(output);

    // Next ticks
    const tickTime = calculateClockTickTimeNs(tempo);
    timer.setInterval(_sendTick(output), '', `${tickTime}n`);
}

/**
 * Checks if the clock is active
 * @returns boolean
 */
export function isClockActive(): boolean {
    return (timer as NanoTimerProperties).intervalTime != null;
}

/**
 * Initializes clock data
 */
export function initClockData() {
    timer.clearInterval();
    tick = 0;
}

/**
 * Stops the clock
 */
export function stopClock(): void {
    isSyncing.set(true);
    initClockData();
    timer = new NanoTimer();
}

/**
 * Resets the clock parameters and marks it as "syncing"
 * @param targetMIDIChannel Target MIDI channel for the virtual MIDI device
 * @param output VirtualMIDI device
 */
function _resetClock(targetMIDIChannel: number, output: ReturnType<JZZTypes['openMidiOut']>) {
    isSyncing.set(true);
    timer.clearInterval();
    tick = 0;
    output.stop();
    output.allNotesOff(targetMIDIChannel);
}

/**
 * Sends the first tick of the MIDI clock
 * @param output VirtualMIDI device
 * @returns
 */
function _sendFirstTick(output: ReturnType<JZZTypes['openMidiOut']>): void {
    _sendTick(output)();
    output.start();
}

/**
 * MIDI clock tick
 * @param output VirtualMIDI device
 * @returns
 */
function _sendTick(output: ReturnType<JZZTypes['openMidiOut']>): () => void {
    return () => {
        // If is bar start and it's not executing blocking section
        if (tick === 0 && !isChordInProgress.get()) {
            // Notify and send the current active mode
            EVENT_EMITTER.emit(EVENT.BAR_LOOP_CHANGE_EVENT, currentChordMode.get());
        }
        output.clock();
        tick = (tick + 1) % 96; // 24ppq * 4 quarter notes
    };
}
