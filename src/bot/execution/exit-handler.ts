import { RefreshingAuthProvider } from '@twurple/auth/lib';
import { promises as fs, existsSync } from 'fs';
import { CONFIG, ERROR_MSG, GLOBAL } from '../../configuration/constants';
import { ParsedEnvObject } from '../../configuration/env/types';
import { stopAllMidi } from '../../midi/handler';
import { toggleRewardsStatus } from '../../rewards/handler';

/**
 * Deletes the execution lock to indicate that the program has exited
 * @returns
 */
export function acquireLock(): Promise<void> {
    // Check if another instance is running.
    // If so, the stored API port will no longer link with the original instance
    if (existsSync(CONFIG.DOT_LOCK)) {
        throw new Error(ERROR_MSG.INSTANCE_ALREADY_RUNNING());
    }

    return fs.writeFile(CONFIG.DOT_LOCK, GLOBAL.EMPTY_MESSAGE);
}

/**
 * Deletes the execution lock to indicate that the program has exited
 * @returns
 */
export function releaseLock(): Promise<void> {
    return fs.rm(CONFIG.DOT_LOCK, { force: true });
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

    process.on('exit', _onExitProcessBeforeInit());
    process.on('SIGHUP', _onExitProcessBeforeInit());
    process.on('SIGINT', _onExitProcessBeforeInit());
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

    process.on('exit', _onExitProcessAfterInit(broadcasterAuthProvider, env));
    process.on('SIGHUP', _onExitProcessAfterInit(broadcasterAuthProvider, env));
    process.on('SIGINT', _onExitProcessAfterInit(broadcasterAuthProvider, env));
}

/**
 * Disables all rewards (if enabled) and exits. It is used for sudden closes of this application
 * @param broadcasterAuthProvider Broadcaster auth provider
 * @param env Environment variables
 */
function _onExitProcessBeforeInit(): () => Promise<void> {
    // Before initialization only check lock
    return async () => {
        await releaseLock();
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
        } catch (error) {
            // Do nothing
        }
        if (env.REWARDS_MODE) {
            await toggleRewardsStatus(broadcasterAuthProvider, env.TARGET_CHANNEL, { isEnabled: false });
        }
        await releaseLock();
        process.exit();
    };
}
