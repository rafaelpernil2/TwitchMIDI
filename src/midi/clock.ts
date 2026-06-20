import { JZZTypes } from '../custom-typing/jzz.js';
import { SharedVariable } from '../shared-variable/implementation.js';
import { isChordInProgress } from './handler.js';
import { Sync } from './types.js';
import { onBarLoopChange } from '../command/queue.js';

// Shared variables
export const syncMode = new SharedVariable<Sync>(Sync.OFF);
export const clockPulses = new SharedVariable<number>(96); // 24ppq * 4 quarter notes
// Clock variables
let clockTimeout: ReturnType<typeof setTimeout> | null = null;
let tickIntervalNs: number | null = null; // null when the clock is stopped
let clockStartTime = process.hrtime.bigint(); // absolute reference for drift compensation
let scheduledTicks = 0; // ticks scheduled since clockStartTime
let tick = 0;
let isClockRunning = false;

/**
 * MIDI Clock: Sends ticks synced with tempo at 24ppq following MIDI spec
 * Formula: ((1_000_000_000 ns/s) * 60 seconds/minute / beats/minute(BPM) / 24ppq (pulses per quarter))
 * @param targetMIDIChannel Target MIDI channel
 * @param output VirtualMIDI device
 * @param tempo Tempo in BPM
 * @param options { sync = false }: { sync: boolean }
 */
export function startClock(targetMIDIChannel: number, output: ReturnType<JZZTypes['openMidiOut']>, tempo: number, { sync } = { sync: true }): void {
    tickIntervalNs = _calculateClockTickTimeNs(tempo);
    const sendTick = _sendTick(output);
    _resetClock(targetMIDIChannel, output, { sync });

    // Drift-compensated scheduler: each tick is timed against an absolute start reference
    // so scheduling error is corrected on the next tick and never accumulates.
    // Avoids NanoTimer's busy-wait, which pinned a full CPU core at tempos above 100 BPM.
    clockStartTime = process.hrtime.bigint();
    scheduledTicks = 0;
    _scheduleNextTick(sendTick);
}

/**
 * Stops the clock
 */
export function stopClock(): void {
    syncMode.set(Sync.FORWARD);
    initClockData();
    tickIntervalNs = null;
}

/**
 * Checks if the clock is active
 * @returns boolean
 */
export function isClockActive(): boolean {
    return tickIntervalNs != null;
}

/**
 * Initializes clock data
 */
export function initClockData(): void {
    if (clockTimeout != null) {
        clearTimeout(clockTimeout);
        clockTimeout = null;
    }
    tick = 0;
}

/**
 * Resets the clock parameters and marks it as "syncing"
 * @param targetMIDIChannel Target MIDI channel for the virtual MIDI device
 * @param output VirtualMIDI device
 * @param options { sync = false }: { sync: boolean }
 */
function _resetClock(targetMIDIChannel: number, output: ReturnType<JZZTypes['openMidiOut']>, { sync } = { sync: true }): void {
    if (sync) {
        syncMode.set(Sync.REPEAT);
    }
    initClockData();
    isClockRunning = false;
    output.stop();
    output.allNotesOff(targetMIDIChannel);
}

/**
 * MIDI clock tick
 * @param output VirtualMIDI device
 * @returns
 */
function _sendTick(output: ReturnType<JZZTypes['openMidiOut']>): () => void {
    let isFirst = true;
    return () => {
        if (!isFirst && !isClockRunning) {
            return;
        }
        // Constant time operations to ensure time stability
        const isInProgress = isChordInProgress.get();
        const pulses = clockPulses.get(); // 24ppq * 4 quarter notes by default
        tick = (tick + 1) % pulses;
        // This way, the next condition always take the exact amout of time

        output.clock();
        // If is bar start and it's not executing blocking section
        if (tick === 1 && !isInProgress) {
            // Notify and send the current active mode
            onBarLoopChange?.();
        }

        if (isFirst) {
            output.start();
            isFirst = false;
            isClockRunning = true;
        }
    };
}

// Busy-wait tail before each tick. The coarse setTimeout phase sleeps until this many
// nanoseconds remain, then a tight spin lands the tick exactly on target.
// Trade-off knob: larger = more timer-slop tolerance + tighter clock but more CPU;
// smaller = less CPU but risks firing late if the OS timer oversleeps past the margin.
const CLOCK_SPIN_MARGIN_NS = 3_000_000n; // 3ms

/**
 * Schedules the next clock tick using a drift-compensated, hybrid timer.
 * The target time is computed from an absolute reference (clockStartTime + n * interval),
 * so any per-tick scheduling error is corrected on the following tick and never accumulates.
 * @param sendTick Tick sender bound to the current MIDI output
 */
function _scheduleNextTick(sendTick: () => void): void {
    if (tickIntervalNs == null) {
        return;
    }
    scheduledTicks++;
    const targetNs = clockStartTime + BigInt(Math.round(tickIntervalNs * scheduledTicks));
    _waitUntilTick(targetNs, sendTick);
}

/**
 * Waits until the absolute target time, then fires the tick and schedules the next one.
 * Sleeps with a coarse setTimeout while far from the target (re-sleeping if the OS oversleeps),
 * then busy-waits only the final CLOCK_SPIN_MARGIN_NS window for sub-millisecond accuracy.
 * @param targetNs Absolute target time in nanoseconds (process.hrtime.bigint scale)
 * @param sendTick Tick sender bound to the current MIDI output
 */
function _waitUntilTick(targetNs: bigint, sendTick: () => void): void {
    if (tickIntervalNs == null) {
        return;
    }
    const remaining = targetNs - process.hrtime.bigint();
    // Far from target: sleep coarsely, leaving the spin margin. Re-check on wake to absorb timer slop.
    if (remaining > CLOCK_SPIN_MARGIN_NS) {
        const delayMs = Number(remaining - CLOCK_SPIN_MARGIN_NS) / 1_000_000;
        clockTimeout = setTimeout(() => _waitUntilTick(targetNs, sendTick), delayMs);
        return;
    }
    // Final stretch: busy-wait to land exactly on target.
    while (process.hrtime.bigint() < targetNs) {
        // spin
    }
    sendTick();
    _scheduleNextTick(sendTick);
}

/**
 * Calculates the tick interval for implementing a MIDI Clock at 24ppq (pulses per quarter) at a determined tempo
 * @param tempo Tempo to check against
 * @returns Tick interval in nanoseconds
 */
function _calculateClockTickTimeNs(tempo: number): number {
    // ns per second * (60/tempo) = time for each hit / 24ppq => MIDI Clock
    return Math.round(60_000_000_000 / (tempo * 24));
}
