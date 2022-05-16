import { JSONDatabase } from '../database/jsondb/implementation';
import { AliasesType, PermissionsType, RewardsType } from '../database/jsondb/types';
import EventEmitter from 'events';
import { Command } from '../command/types';

export const CONFIG = {
    ALIASES_DB_PATH: './config/aliases.json',
    TOKENS_TEMPLATE_PATH: './config/tokens.template.json',
    BOT_TOKENS_PATH: './config/bot-tokens.json',
    BROADCASTER_TOKENS_PATH: './config/broadcaster-tokens.json',
    REWARDS_PATH: './config/rewards.json',
    PERMISSIONS_DB: './config/permissions.json',
    PACKAGE_JSON_PATH: './package.json',
    DOT_ENV_PATH: '.env',
    DEFAULT_OCTAVE: '5',
    DEFAULT_VOLUME: 64,
    MIN_TEMPO: 35,
    MAX_TEMPO: 400,
    DEFAULT_TEMPO: 120,
    DEFAULT_SWEEP_FREQUENCY: 60,
    FULFILL_TIMEOUT_MS: 10000,
    LOCAL_SERVER_HOST: 'localhost',
    LOCAL_SERVER_PORT: 8000,
    REDIRECT_URI: 'http://localhost:8000',
    TWITCH_BASE_AUTH_URL: 'https://id.twitch.tv/oauth2/',
    GITHUB_CONTENT_BASE_URL: 'raw.githubusercontent.com',
    REMOTE_PACKAGE_JSON_PATH: '/rafaelpernil2/TwitchMIDI/master/package.json',
    DEFAULT_USER_ROLES: { isBroadcaster: false, isMod: false, isSubscriber: false, isVip: false, isFounder: false }
};

export const ERROR_MSG = {
    BAD_ENV_VARIABLE_GENERIC: 'Some .env variables are wrong. Check the previous errors',
    INIT_ENV_VARIABLES: `Your .env file is not ready to use.\nProbably this is your first time running the app, follow the next configuration steps :)`,
    BAD_ENV_VARIABLE: (keys: string) => `This app cannot be executed, make sure you set a valid value for ${keys} inside the .env file. `,
    BOT_PAUSED_DISCONNECTED: 'TwitchMIDI is disabled or paused right now. Wait until the streamer enables it :)',
    BOT_DISCONNECTED: 'TwitchMIDI is disabled right now. Enable it with !midion',
    BAD_MIDI_CHANNEL: 'Make sure "TARGET_MIDI_CHANNEL" is a valid MIDI channel between 1 and 16 (both inclusive)',
    BAD_MIDI_MESSAGE: 'Bad MIDI message, the value must be between 0 and 127 (inclusive)',
    BAD_MIDI_NOTE: 'Bad MIDI note, make sure you sent a valid note like C, F#, G...',
    INVALID_VOLUME: 'Please set a volume between 0% and 100%',
    INVALID_TEMPO: `Please set a tempo between ${CONFIG.MIN_TEMPO} and ${CONFIG.MAX_TEMPO} (Default: ${CONFIG.DEFAULT_TEMPO}, decimal point is . )`,
    CHORD_PROGRESSION_NOT_FOUND: 'Chord progression/loop not found',
    CHORD_PROGRESSION_BAD_INSERTION: 'Chord progression/loop could not be inserted',
    INVALID_CHORD: (chord: string) => 'There is at least one invalid chord or the alias was not found: ' + chord,
    MIDI_DISCONNECTION_ERROR: 'MIDI could not be disconnected',
    MIDI_CONNECTION_ERROR: 'MIDI could not be connected',
    BAD_CC_MESSAGE: 'Bad Control Change message, please review your values. Controller/value must be between 0 and 127 (inclusive)',
    BAD_SWEEP_DELAY: 'Invalid control change sweep, make sure your delay times are in incremental order',
    BAD_PERMISSIONS: "You don't have enough permissions to use this command. Sorry!",
    INVALID_SWEEP_RANGE: 'Invalid sweep range',
    INIT: 'There was an initialization error. Please, close the app (Ctrl+C or close the terminal window)',
    INVALID_REWARD: 'Invalid MIDI command from reward, please review the configuration of this bot',
    BAD_SETUP_PROCESS: 'Bad setup, try again',
    DUPLICATE_REQUEST: 'This request is already queued, wait until the previous request is fulfilled',
    BROADCASTER_USER_NOT_FOUND: 'Broadcaster not found'
};

export const TOGGLE_MIDI_VALUES: Record<string, string> = { on: '127', off: '0' };

export const GLOBAL = {
    POUND: '#',
    EMPTY_MESSAGE: '',
    COMMA_SEPARATOR: ',',
    COMMA_JOIN: ', ',
    SLASH_SEPARATOR: '/',
    SPACE_SEPARATOR: ' ',
    EXCLAMATION_MARK: '!',
    OPEN_PARENTHESIS_SEPARATOR: '(',
    CLOSE_PARENTHESIS_SEPARATOR: ')',
    CC_CONTROLLER: 'CC#',
    MUSIC_REST_TOKEN: 'rest'
} as const;

export const COMMAND_DESCRIPTIONS: Record<typeof Command[keyof typeof Command], string> = {
    midihelp: 'Shows all commands available and info about each command. Syntax: command (e.g "sendloop")',
    midion: 'Turns on the bot',
    midioff: 'Turns off the bot',
    addchord: 'Adds a chord progression or loop with an alias. Syntax: name/chords(chord length in quarter notes) (e.g. "pop/C G(2) Amin(2) F")',
    removechord: 'Removes a chord progression or loop with an alias. Syntax: alias (e.g. "pop")',
    chordlist: 'Shows all saved chord progressions or loops that can be used',
    sendnote: 'Sends a note, a set of notes building a chord or a melody. Syntax: note1 note2, note3 ... (e.g. "C4 E4 G4" or "C4, E4, G4")',
    sendchord: 'Sends a chord progression with an alias or with chords. Syntax: chord1 chord2(chord length in quarter notes)... (e.g. "C(4) G Amin(2) F","pop")',
    sendloop: 'Sends a loop with an alias or with chords. Syntax: chord1 chord2(chord length in quarter notes)... (e.g. "C G Amin F","pop")',
    sendcc: 'Sends a MIDI CC message with an alias, code or value sweeps. Syntax: controller value,controller2 value2(delay_in_ms) (e.g. "43 100,43 60","cutoff sweep","cutoff 100,cutoff 60","cutoff 100,cutoff 10(10000)")',
    cclist: 'Shows a list of available CC command macros (e.g. cutoff sweep)',
    midivolume: 'Sets the velocity for the chords/notes/loops. Syntax: value between 0 and 100 (e.g. "50","100")',
    stoploop: 'Stops the loop once it ends',
    fullstopmidi: 'Stops all MIDI messages and sound',
    settempo: 'Starts the MIDI clock and sets a tempo. Syntax: tempo (e.g. "120", "200")',
    syncmidi: 'Restarts the MIDI clock and syncs loop and clock on the next repetition',
    fetchdb: 'Refreshes aliases configuration',
    midicurrentrequest: 'Shows the current request being played',
    midirequestqueue: 'Shows the request queue for chord progressions and loops',
    midipause: 'Pauses the requests but keeps playing whatever was already playing',
    midiresume: 'Reactivates requests after they were paused with !midipause'
} as const;

export const SAFE_COMMANDS: Record<typeof Command[keyof typeof Command], boolean> = {
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
    cclist: true,
    midivolume: false,
    stoploop: false,
    fullstopmidi: false,
    settempo: false,
    syncmidi: false,
    fetchdb: false,
    midicurrentrequest: true,
    midirequestqueue: true,
    midipause: false,
    midiresume: false
} as const;

export const ALIASES_DB = new JSONDatabase<AliasesType>(CONFIG.ALIASES_DB_PATH);
export const REWARDS_DB = new JSONDatabase<RewardsType>(CONFIG.REWARDS_PATH);
export const PERMISSIONS_DB = new JSONDatabase<PermissionsType>(CONFIG.PERMISSIONS_DB);

export const EVENT_EMITTER = new EventEmitter(); // I use Node.js events for notifying when the beat start is ready

export const EVENT = {
    BAR_LOOP_CHANGE_EVENT: 'barLoopChange',
    PLAYING_NOW: 'playingNow'
};
