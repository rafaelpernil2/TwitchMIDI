export const ERROR_MSG = {
    BAD_MIDI_CONNECTION: "Bad MIDI connection. Try !midion first",
    INVALID_VOLUME: "Please set a volume between 0% and 100%",
    CHORD_PROGRESSION_NOT_FOUND: "Chord progression/loop not found",
    CHORD_PROGRESSION_BAD_INSERTION: "Chord progression/loop could not be inserted",
    INVALID_CHORD: (chord: string) => "There is at least one invalid chord or the alias was not found: " + chord,
    MIDI_DISCONNECTION_ERROR: "MIDI could not be disconnected",
    MIDI_CONNECTION_ERROR: "MIDI could not be connected"
}

export const GLOBAL = {
    EMPTY_MESSAGE: ""
}

export const CONFIG = {
    ALIASES_DB_PATH: "./config/aliases.json",
    DEFAULT_VOLUME: 0.8,
    DEFAULT_TEMPO: 120,
}