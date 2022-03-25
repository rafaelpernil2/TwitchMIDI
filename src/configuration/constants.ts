import { JSONDatabase } from '../providers/jsondb-provider';
import { AliasesType, COMMANDS_KEY } from '../types/jsondb-types';
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
    TWITCH_API: 'Could not connect to Twitch',
    INVALID_REWARD: 'Invalid MIDI command from reward, please review the configuration of this bot',
    BAD_SETUP_PROCESS: 'Bad setup, try again'
};

export const GLOBAL = {
    POUND: '#',
    EMPTY_MESSAGE: '',
    COMMA_SEPARATOR: ',',
    SLASH_SEPARATOR: '/',
    SPACE_SEPARATOR: ' ',
    EXCLAMATION_TOKEN: '!',
    OPEN_PARENTHESIS_SEPARATOR: '(',
    CLOSE_PARENTHESIS_SEPARATOR: ')',
    CC_CONTROLLER: 'CC#'
} as const;

export const CONFIG = {
    ALIASES_DB_PATH: './config/aliases.json',
    TOKENS_TEMPLATE_PATH: './config/tokens.template.json',
    BOT_TOKENS_PATH: './config/bot-tokens.json',
    BROADCASTER_TOKENS_PATH: './config/broadcaster-tokens.json',
    REWARDS_PATH: './config/rewards.json',
    DOT_ENV_PATH: '.env',
    DEFAULT_VOLUME: 0.8,
    DEFAULT_TEMPO: 120,
    LOCAL_SERVER_HOST: 'localhost',
    LOCAL_SERVER_PORT: 8000,
    REDIRECT_URI: 'http://localhost:8000',
    TWITCH_BASE_AUTH_URL: 'https://id.twitch.tv/oauth2/'
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

export const SAFE_COMMANDS: Record<typeof COMMANDS[keyof typeof COMMANDS], boolean> = {
    midion: false,
    midioff: false,
    addchord: false,
    removechord: false,
    chordlist: true,
    sendnote: false,
    sendchord: false,
    sendloop: false,
    sendcc: false,
    midivolume: false,
    stoploop: false,
    fullstopmidi: false,
    settempo: false,
    syncmidi: true,
    fetchdb: false
} as const;

export const ALIASES_DB = new JSONDatabase<AliasesType>(CONFIG.ALIASES_DB_PATH);

export const ALIAS_MAP: Record<string, CommandType> = ALIASES_DB.selectAll(COMMANDS_KEY) ?? {};

export const COMMAND_VALUES = Object.fromEntries([...Object.entries(ALIAS_MAP), ...Object.entries(COMMANDS).map(([, v]) => [v, 1])]) as Record<string, string>;
