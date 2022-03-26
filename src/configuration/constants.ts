import { JSONDatabase } from '../providers/jsondb-provider';
import { AliasesType, COMMANDS_KEY, RewardsType } from '../types/jsondb-types';
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

export const TOGGLE_MIDI_VALUES: Record<string, string> = { on: '127', off: '0' };

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
    MIDI_HELP: 'midihelp',
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

export const COMMAND_DESCRIPTIONS: Record<typeof COMMANDS[keyof typeof COMMANDS], string> = {
    midihelp: 'Shows all commands available and info about each command. Syntax: command (e.g "sendloop")',
    midion: 'Turns on the bot',
    midioff: 'Turns off the bot',
    addchord: 'Adds a chord progression or loop with an alias. Syntax: name/chords (e.g. "pop/C G Amin F")',
    removechord: 'Removes a chord progression or loop with an alias. Syntax: alias (e.g. "pop")',
    chordlist: 'Shows all saved chord progressions or loops that can be used',
    sendnote: 'Sends a note or a set of notes. Syntax: note1 note2 ... (e.g. "C4 E4 G4")',
    sendchord: 'Sends a chord progression with an alias or with chords. Syntax: chord1 chord2... (e.g. "C G Amin F","pop")',
    sendloop: 'Sends a loop with an alias or with chords. Syntax: chord1 chord2... (e.g. "C G Amin F","pop")',
    sendcc: 'Sends a MIDI CC message with an alias, code or value sweeps. Syntax: controller value,controller2 value2(delay_in_ms) (e.g. "43 100,43 60","cutoff sweep","cutoff 100,cutoff 60","cutoff 100,cutoff 10(10000)")',
    midivolume: 'Sets the velocity for the chords/notes/loops. Syntax: value between 0 and 100 (e.g. "50","100")',
    stoploop: 'Stops the loop once it ends',
    fullstopmidi: 'Stops all MIDI messages and sound',
    settempo: 'Starts the MIDI clock and sets a tempo. Syntax: tempo (e.g. "120", "200")',
    syncmidi: 'Restarts the MIDI clock and syncs loop and clock on the next repetition',
    fetchdb: 'Refreshes aliases configuration'
} as const;

export const SAFE_COMMANDS: Record<typeof COMMANDS[keyof typeof COMMANDS], boolean> = {
    midihelp: true,
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
export const REWARDS_DB = new JSONDatabase<RewardsType>(CONFIG.REWARDS_PATH);

export const ALIAS_MAP: Record<string, CommandType> = ALIASES_DB.selectAll(COMMANDS_KEY) ?? {};

export const COMMAND_VALUES = Object.fromEntries([...Object.entries(ALIAS_MAP), ...Object.entries(COMMANDS).map(([, v]) => [v, 1])]) as Record<string, string>;