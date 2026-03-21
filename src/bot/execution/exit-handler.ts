import { RefreshingAuthProvider } from '@twurple/auth';
import { writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { CONFIG, ERROR_MSG } from '../../configuration/constants.js';
import { ParsedEnvObject } from '../../configuration/env/types.js';
import { stopAllMidi } from '../../midi/handler.js';
import { toggleRewardsStatus } from '../../twitch/rewards/handler.js';
import process from 'process';

/**
 * Obtains an execution lock to indicate that the program is open
 * @returns
 */
export function acquireLock(): void {
    // If a .lock file exists
    if (existsSync(CONFIG.DOT_LOCK)) {
        // Check if instance with .lock PID is running
        const pid = parseInt(readFileSync(CONFIG.DOT_LOCK, 'utf-8'), 10);

        // If so, throw error and exit process
        if (_isPidRunning(pid)) {
            throw new Error(ERROR_MSG.INSTANCE_ALREADY_RUNNING());
        }
    }

    return writeFileSync(CONFIG.DOT_LOCK, process.pid.toString());
}

/**
 * Attaches a callback before initialization to exit process signals
 * @param broadcasterAuthProvider Broadcaster auth provider
 * @param env Environment variables
 */
export function attachExitCallbacksBeforeInit(): void {
    // Initialize
    process.removeAllListeners('exit');
    process.removeAllListeners('SIGHUP');
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('uncaughtException');

    process.on('exit', _onExitProcessBeforeInit());
    process.on('SIGHUP', _onExitProcessBeforeInit());
    process.on('SIGINT', _onExitProcessBeforeInit());
    process.on('uncaughtException', (error) => {
        console.log(error);
        console.log(ERROR_MSG.INIT());
        _onExitProcessBeforeInit()();
    });
}

/**
 * Attaches a callback after initialization to exit process signals
 * @param broadcasterAuthProvider Broadcaster auth provider
 * @param env Environment variables
 */
export function attachExitCallbacksAfterInit(broadcasterAuthProvider: RefreshingAuthProvider, env: ParsedEnvObject): void {
    // Initialize
    process.removeAllListeners('exit');
    process.removeAllListeners('SIGHUP');
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('uncaughtException');

    process.on('exit', _onExitProcessAfterInit(broadcasterAuthProvider, env));
    process.on('SIGHUP', _onExitProcessAfterInit(broadcasterAuthProvider, env));
    process.on('SIGINT', _onExitProcessAfterInit(broadcasterAuthProvider, env));
    process.on('uncaughtException', _onExitProcessAfterInit(broadcasterAuthProvider, env));
}

/**
 * Deletes the execution lock to indicate that the program has exited
 * @returns
 */
function _releaseLock(): void {
    return rmSync(CONFIG.DOT_LOCK, { force: true });
}

/**
 * Disables all rewards (if enabled) and exits. It is used for sudden closes of this application
 * @param broadcasterAuthProvider Broadcaster auth provider
 * @param env Environment variables
 */
function _onExitProcessBeforeInit(): () => void {
    // Before initialization only check lock
    return () => {
        _releaseLock();
        process.exit();
    };
}

/**
 * Disables all rewards (if enabled) and exits. It is used for sudden closes of this application
 * @param broadcasterAuthProvider Broadcaster auth provider
 * @param env Environment variables
 */
function _onExitProcessAfterInit(broadcasterAuthProvider: RefreshingAuthProvider, env: ParsedEnvObject): () => Promise<void> {
    // After initialization check everything
    return async () => {
        try {
            stopAllMidi(env.TARGET_MIDI_CHANNEL);
        } catch {
            // Do nothing
        }
        if (env.REWARDS_MODE) {
            await toggleRewardsStatus(broadcasterAuthProvider, env.TARGET_CHANNEL, { isEnabled: false });
        }
        _releaseLock();
        process.exit();
    };
}

/**
 * Checks if a process is running
 * @param pid Process ID
 * @returns True if running, false otherwise
 */
function _isPidRunning(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}
