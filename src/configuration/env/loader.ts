import { EnvObject, envVariables, ParsedEnvVariables } from './types';
import { ERROR_MSG, GLOBAL } from '../constants';
import * as VALIDATORS from './validators';
import { getBooleanByStringList } from '../../utils/generic';

/**
 * Loads all variables from process.env (after being loaded by dotenv) and triggers the setup if some variable is missing
 * @param altSetupProcess Setup process called if some variable is missing
 * @returns All environment variables ready to go
 */
export async function getLoadedEnvVariables(altSetupProcess?: (currentVariables: EnvObject) => Promise<EnvObject>): Promise<ParsedEnvVariables> {
    try {
        const loadedVariables =  _getVariables();
        return _parseEnvVariables(loadedVariables);
    } catch (error) {
        console.log(String(error));
        const currentVariables = Object.fromEntries(envVariables.map((key) => [key, process.env[key]])) as EnvObject;
        const loadedVariables = await altSetupProcess?.(currentVariables);
        // We validate again, just in case
        if (loadedVariables == null || !_areVariablesValid(loadedVariables)) {
            throw new Error(ERROR_MSG.BAD_SETUP_PROCESS());
        }
        // Parse variables
        return _parseEnvVariables(loadedVariables);
    }
}

/**
 * Obtains the variables from process.env and validates them
 * @returns The validated envionment variables
 */
function _getVariables(): EnvObject {
    const loadedVariables = Object.fromEntries(envVariables.map((key) => [key, process.env[key]]));
    if (!_areVariablesValid(loadedVariables)) {
        throw new Error(ERROR_MSG.BAD_ENV_VARIABLE_GENERIC());
    }
    return loadedVariables;
}

/**
 * Checks if all the expected environment variables were loaded correctly and triggers validation if available
 * Throws an error for each invalid variable
 * @param loadedVariables A set of loaded environment variables
 * @returns
 */
function _areVariablesValid(loadedVariables: Record<string, string | undefined>): loadedVariables is EnvObject {
    const invalidVariables = Object.entries(loadedVariables).filter(
        ([key, value]) => value == null || value === GLOBAL.EMPTY_MESSAGE || VALIDATORS?.[key as keyof typeof VALIDATORS]?.(value) === false
    );

    // If it's the first time running
    if (invalidVariables.length === Object.entries(loadedVariables).length) {
        throw new Error(ERROR_MSG.INIT_ENV_VARIABLES());
    }
    if (invalidVariables.length !== 0) {
        const invalidKeys = invalidVariables.map(([key]) => key).join(GLOBAL.COMMA_JOIN);
        throw new Error(ERROR_MSG.BAD_ENV_VARIABLE(invalidKeys));
    }

    return true;
}

/**
 * Parse Env variables and conver types where needed
 * @param env EnvObject
 * @returns ParsedEnvVariables
 */
function _parseEnvVariables(env: EnvObject): ParsedEnvVariables {
    const [REWARDS_MODE, VIP_REWARDS_MODE, SEND_UNAUTHORIZED_MESSAGE, SILENCE_MACRO_MESSAGES] = getBooleanByStringList(env.REWARDS_MODE, env.VIP_REWARDS_MODE, env.SEND_UNAUTHORIZED_MESSAGE, env.SILENCE_MACRO_MESSAGES);
    const TARGET_MIDI_CHANNEL = Number(env.TARGET_MIDI_CHANNEL) - 1;

    return { ...env, TARGET_MIDI_CHANNEL, REWARDS_MODE, VIP_REWARDS_MODE, SEND_UNAUTHORIZED_MESSAGE, SILENCE_MACRO_MESSAGES };
}
