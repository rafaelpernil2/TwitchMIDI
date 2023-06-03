import { getBooleanByStringList } from '../../utils/generic.js';
import { EnvObject, ParsedEnvObject } from './types.js';

/**
 * Parse Env variables and convert types where needed
 * @param env EnvObject
 * @returns ParsedEnvVariables
 */
export function parseEnvVariables(env: EnvObject): ParsedEnvObject {
    const [REWARDS_MODE, VIP_REWARDS_MODE, SEND_UNAUTHORIZED_MESSAGE, SILENCE_MACRO_MESSAGES] = getBooleanByStringList(
        env.REWARDS_MODE,
        env.VIP_REWARDS_MODE,
        env.SEND_UNAUTHORIZED_MESSAGE,
        env.SILENCE_MACRO_MESSAGES
    );
    const TARGET_MIDI_CHANNEL = Number(env.TARGET_MIDI_CHANNEL) - 1;

    return { ...env, TARGET_MIDI_CHANNEL, REWARDS_MODE, VIP_REWARDS_MODE, SEND_UNAUTHORIZED_MESSAGE, SILENCE_MACRO_MESSAGES };
}
