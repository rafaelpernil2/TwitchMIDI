import { EnvObject } from '../types/env-object-type';
import { ERROR_MSG, GLOBAL } from './constants';

async function getLoadedEnvVariables(altSetupProcess?: () => Promise<EnvObject>): Promise<EnvObject> {
    function getVariables() {
        const variablesToLoad: Partial<EnvObject> = {
            CLIENT_ID: undefined,
            CLIENT_SECRET: undefined,
            BOT_ACCESS_TOKEN: undefined,
            BOT_REFRESH_TOKEN: undefined,
            BROADCASTER_ACCESS_TOKEN: undefined,
            BROADCASTER_REFRESH_TOKEN: undefined,
            TARGET_CHANNEL: undefined,
            TARGET_MIDI_NAME: undefined,
            TARGET_MIDI_CHANNEL: undefined,
            REWARDS_MODE: undefined,
            VIP_REWARDS_MODE: undefined
        };
        const loadedVariables = Object.fromEntries(Object.entries(variablesToLoad).map(([key]) => [key, process.env[key]])) as EnvObject;
        areVariablesValid(loadedVariables);
        return loadedVariables;
    }

    try {
        return getVariables();
    } catch (error) {
        const loadedVariables = await altSetupProcess?.();
        if (loadedVariables == null) {
            throw new Error(ERROR_MSG.BAD_SETUP_PROCESS);
        }
        areVariablesValid(loadedVariables);
        // Let's try again
        return loadedVariables;
    }
}

function areVariablesValid(loadedVariables: Record<string, string | undefined>): loadedVariables is EnvObject {
    const invalidVariables = Object.entries(loadedVariables).filter(([, value]) => value == null || value === GLOBAL.EMPTY_MESSAGE);
    for (const [key] of invalidVariables) {
        throw new Error(`This app cannot be executed, make sure you set a valid value for ${key} inside the .env file`);
    }
    return invalidVariables.length === 0;
}

export { getLoadedEnvVariables };
