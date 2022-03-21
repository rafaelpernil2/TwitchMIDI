import {EnvObject} from '../types/env-object-type';

function getLoadedEnvVariables(): EnvObject {
  const variablesToLoad: Partial<EnvObject> = {
    CLIENT_ID: undefined,
    CLIENT_SECRET: undefined,
    INITIAL_ACCESS_TOKEN: undefined,
    INITIAL_REFRESH_TOKEN: undefined,
    TARGET_CHANNEL: undefined,
    TARGET_MIDI_NAME: undefined,
    TARGET_MIDI_CHANNEL: undefined,
  };
  const loadedVariables = Object.fromEntries(Object.entries(variablesToLoad).map(([key]) => ([key, process.env[key]]))) as EnvObject;
  areVariablesValid(loadedVariables);
  return loadedVariables;
}

function areVariablesValid(loadedVariables: Record<string, string | undefined>): loadedVariables is EnvObject {
  const invalidVariables = Object.entries(loadedVariables).filter(([, value]) => value == null);
  for (const [key] of invalidVariables) {
    throw new Error(`This app cannot be executed, make sure you set a valid value for ${key} inside the .env file`);
  }
  return invalidVariables.length === 0;
}

export {getLoadedEnvVariables};
