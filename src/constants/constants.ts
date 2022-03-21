export const ERROR_MSG = {
    BAD_MIDI_CONNECTION: "Bad MIDI connection. Try !midion first",
    INVALID_VOLUME: "Please set a volume between 0% and 100%",
    CHORD_PROGRESSION_NOT_FOUND: "Chord progression/loop not found",
    CHORD_PROGRESSION_BAD_INSERTION: "Chord progression/loop could not be inserted",
    INVALID_CHORD: (chord: string) => "There is at least one invalid chord or the alias was not found: " + chord,
    MIDI_DISCONNECTION_ERROR: "MIDI could not be disconnected",
    MIDI_CONNECTION_ERROR: "MIDI could not be connected",
    BAD_CC_MESSAGE: "Bad Control Change message, please review your values. Controller/value must be between 0 and 127 (inclusive)",
    INSUFFICIENT_PERMISSIONS: "You don't have enough permissions to use this command, ask me or a mod to launch this command or subscribe to this channel",
    INVALID_SWEEP_RANGE: "Invalid sweep range"
}

export const GLOBAL = {
    EMPTY_MESSAGE: ""
}

export const CONFIG = {
    ALIASES_DB_PATH: "./config/aliases.json",
    DEFAULT_VOLUME: 0.8,
    DEFAULT_TEMPO: 120,
}