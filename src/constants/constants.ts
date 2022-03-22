import { CommandType } from '../types/message-types';

export const ERROR_MSG = {
    BAD_MIDI_CONNECTION: 'Bad MIDI connection. Try !midion first',
    INVALID_VOLUME: 'Please set a volume between 0% and 100%',
    CHORD_PROGRESSION_NOT_FOUND: 'Chord progression/loop not found',
    CHORD_PROGRESSION_BAD_INSERTION: 'Chord progression/loop could not be inserted',
    INVALID_CHORD: (chord: string) => 'There is at least one invalid chord or the alias was not found: ' + chord,
    MIDI_DISCONNECTION_ERROR: 'MIDI could not be disconnected',
    MIDI_CONNECTION_ERROR: 'MIDI could not be connected',
    BAD_CC_MESSAGE: 'Bad Control Change message, please review your values. Controller/value must be between 0 and 127 (inclusive)',
    INSUFFICIENT_PERMISSIONS: "You don't have enough permissions to use this command, ask me or a mod to launch this command or subscribe to this channel",
    INVALID_SWEEP_RANGE: 'Invalid sweep range',
    TWITCH_API: 'Could not connect to Twitch'
};

export const GLOBAL = {
    EMPTY_MESSAGE: '',
    COMMA_SEPARATOR: ',',
    SLASH_SEPARATOR: '/',
    SPACE_SEPARATOR: ' ',
    EXCLAMATION_TOKEN: '!',
    OPEN_PARENTHESIS_SEPARATOR: '(',
    CLOSE_PARENTHESIS_SEPARATOR: ')',
    CC_CONTROLLER: 'CC#'
};

export const CONFIG = {
    ALIASES_DB_PATH: './config/aliases.json',
    TOKENS_TEMPLATE_PATH: './config/tokens.template.json',
    TOKENS_PATH: './config/tokens.json',
    DEFAULT_VOLUME: 0.8,
    DEFAULT_TEMPO: 120
};

export const COMMANDS = {
    MIDI_ON: 'midion',
    MIDI_OFF: 'midioff',
    ADD_CHORD_ALIAS: 'addchord',
    REMOVE_CHORD_ALIAS: 'removechord',
    GET_CHORD_LIST: 'chordlist',
    SEND_NOTE: 'sendnote',
    SEND_CHORD: 'sendchord',
    SEND_LOOP: 'sendloop',
    SEND_CC: 'sendcc',
    MIDI_VOLUME: 'midivolume',
    STOP_LOOP: 'stoploop',
    FULL_STOP: 'fullstopmidi',
    SET_TEMPO: 'settempo',
    SYNC: 'syncmidi',
    FETCH_DB: 'fetchdb'
} as const;

export const ALIAS_MAP: Record<string, CommandType> = {
    encendermidi: COMMANDS.MIDI_ON,
    encenderjamones: COMMANDS.MIDI_ON,
    apagarmidi: COMMANDS.MIDI_OFF,
    apagarjamones: COMMANDS.MIDI_OFF,
    volumemidi: COMMANDS.MIDI_VOLUME,
    volumenmidi: COMMANDS.MIDI_VOLUME,
    volumenacorde: COMMANDS.MIDI_VOLUME,
    volumenloop: COMMANDS.MIDI_VOLUME,
    volumenbucle: COMMANDS.MIDI_VOLUME,
    tempo: COMMANDS.SET_TEMPO,
    chord: COMMANDS.SEND_CHORD,
    acordes: COMMANDS.SEND_CHORD,
    progresion: COMMANDS.SEND_CHORD,
    loop: COMMANDS.SEND_LOOP,
    pararbucle: COMMANDS.STOP_LOOP,
    pararloop: COMMANDS.STOP_LOOP,
    bucle: COMMANDS.SEND_LOOP,
    sync: COMMANDS.SYNC,
    sincronizar: COMMANDS.SYNC,
    stop: COMMANDS.FULL_STOP,
    fullstop: COMMANDS.FULL_STOP,
    addloop: COMMANDS.ADD_CHORD_ALIAS,
    deleteloop: COMMANDS.REMOVE_CHORD_ALIAS,
    quitarloop: COMMANDS.REMOVE_CHORD_ALIAS,
    deletechord: COMMANDS.REMOVE_CHORD_ALIAS,
    looplist: COMMANDS.GET_CHORD_LIST,
    nota: COMMANDS.SEND_NOTE,
    note: COMMANDS.SEND_NOTE,
    cc: COMMANDS.SEND_CC,
    controlchange: COMMANDS.SEND_CC
};

export const COMMAND_VALUES = Object.fromEntries([...Object.entries(ALIAS_MAP), ...Object.entries(COMMANDS).map(([, v]) => [v, 1])]) as Record<string, string>;
