import { EnvObject, envVariables } from './types';
import { ERROR_MSG, GLOBAL } from '../constants';
import * as VALIDATORS from './validators';

/**
 * Loads all variables from process.env (after being loaded by dotenv) and triggers the setup if some variable is missing
 * @param altSetupProcess Setup process called if some variable is missing
 * @returns All environment variables ready to go
 */
export async function getLoadedEnvVariables(altSetupProcess?: () => Promise<EnvObject>): Promise<EnvObject> {
    try {
        return _getVariables();
    } catch (error) {
        const loadedVariables = await altSetupProcess?.();
        // We validate again, just in case
        if (loadedVariables == null || !_areVariablesValid(loadedVariables)) {
            throw new Error(ERROR_MSG.BAD_SETUP_PROCESS);
        }
        return loadedVariables;
    }
}

/**
 * Obtains the variables from process.env and validates them
 * @returns The validated envionment variables
 */
function _getVariables(): EnvObject {
    const loadedVariables = Object.fromEntries(envVariables.map((key) => [key, process.env[key]]));
    if (!_areVariablesValid(loadedVariables)) {
        throw new Error(ERROR_MSG.BAD_ENV_VARIABLE_GENERIC);
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
    for (const [key] of invalidVariables) {
        throw new Error(ERROR_MSG.BAD_ENV_VARIABLE(key));
    }
    return invalidVariables.length === 0;
}
