import { JSONDatabase } from '../database/jsondb/implementation';
import { AliasesType, PermissionsType, RewardsType } from '../database/jsondb/types';
import EventEmitter from 'events';
import { Command } from '../command/types';
import i18n from '../i18n/loader';

export const CONFIG = {
    ALIASES_DB_PATH: './config/aliases.json',
    TOKENS_TEMPLATE_PATH: './config/tokens.template.json',
    BOT_TOKENS_PATH: './config/bot-tokens.json',
    BROADCASTER_TOKENS_PATH: './config/broadcaster-tokens.json',
    REWARDS_PATH: './config/rewards.json',
    PERMISSIONS_DB: './config/permissions.json',
    PACKAGE_JSON_PATH: './package.json',
    DOT_ENV_PATH: '.env',
    DOT_API_PORT: '.apiPort',
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
    SPONSOR_PAYPAL_LINK: 'https://www.paypal.com/donate/?hosted_button_id=9RRAEE5J7NNNN',
    REPOSITORY_LINK: 'https://github.com/rafaelpernil2/TwitchMIDI',
    DEFAULT_USER_ROLES: { isBroadcaster: false, isMod: false, isSubscriber: false, isVip: false, isFounder: false }
};

export const ERROR_MSG = {
    BAD_ENV_VARIABLE_GENERIC: () => i18n.t('ERROR_BAD_ENV_VARIABLE_GENERIC'),
    INIT_ENV_VARIABLES: () => i18n.t('ERROR_INIT_ENV_VARIABLES'),
    BAD_ENV_VARIABLE: (keys: string) => `${i18n.t('ERROR_BAD_ENV_VARIABLE_1')} ${keys} ${i18n.t('ERROR_BAD_ENV_VARIABLE_2')}`,
    BOT_PAUSED_DISCONNECTED: () => i18n.t('ERROR_BOT_PAUSED_DISCONNECTED'),
    BOT_DISCONNECTED: () => i18n.t('ERROR_BOT_DISCONNECTED'),
    BAD_MIDI_CHANNEL: () => i18n.t('ERROR_BAD_MIDI_CHANNEL'),
    BAD_MIDI_MESSAGE: () => i18n.t('ERROR_BAD_MIDI_MESSAGE'),
    BAD_MIDI_NOTE: () => i18n.t('ERROR_BAD_MIDI_NOTE'),
    INVALID_VOLUME: () => i18n.t('ERROR_INVALID_VOLUME'),
    INVALID_TEMPO: () =>
        `${i18n.t('ERROR_INVALID_TEMPO_1')} ${CONFIG.MIN_TEMPO} ${i18n.t('ERROR_INVALID_TEMPO_2')} ${CONFIG.MAX_TEMPO} ${i18n.t('ERROR_INVALID_TEMPO_3')} ${
            CONFIG.DEFAULT_TEMPO
        }${i18n.t('ERROR_INVALID_TEMPO_4')}`,
    CHORD_PROGRESSION_NOT_FOUND: () => i18n.t('ERROR_CHORD_PROGRESSION_NOT_FOUND'),
    CHORD_PROGRESSION_BAD_INSERTION: () => i18n.t('ERROR_CHORD_PROGRESSION_BAD_INSERTION'),
    INVALID_CHORD: (chord: string) => i18n.t('ERROR_INVALID_CHORD') + ' ' + chord,
    MIDI_DISCONNECTION_ERROR: () => i18n.t('ERROR_MIDI_DISCONNECTION_ERROR'),
    MIDI_CONNECTION_ERROR: () => i18n.t('ERROR_MIDI_CONNECTION_ERROR'),
    BAD_CC_MESSAGE: () => i18n.t('ERROR_BAD_CC_MESSAGE'),
    BAD_SWEEP_DELAY: () => i18n.t('ERROR_BAD_SWEEP_DELAY'),
    BAD_PERMISSIONS: () => i18n.t('ERROR_BAD_PERMISSIONS'),
    INVALID_SWEEP_RANGE: () => i18n.t('ERROR_INVALID_SWEEP_RANGE'),
    INIT: () => i18n.t('ERROR_INIT'),
    INVALID_REWARD: () => i18n.t('ERROR_INVALID_REWARD'),
    BAD_SETUP_PROCESS: () => i18n.t('ERROR_BAD_SETUP_PROCESS'),
    DUPLICATE_REQUEST: () => i18n.t('ERROR_DUPLICATE_REQUEST'),
    BROADCASTER_USER_NOT_FOUND: () => i18n.t('ERROR_BROADCASTER_USER_NOT_FOUND'),
    INVALID_AFFIXES: () => i18n.t('ERROR_INVALID_AFFIXES')
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
    MUSIC_REST_TOKEN: 'rest',
    ETC: '...'
} as const;

export const COMMAND_DESCRIPTIONS: Record<typeof Command[keyof typeof Command], () => string> = {
    midihelp: () => i18n.t('HELP_MIDIHELP'),
    midion: () => i18n.t('HELP_MIDION'),
    midioff: () => i18n.t('HELP_MIDIOFF'),
    addchord: () => i18n.t('HELP_ADDCHORD'),
    removechord: () => i18n.t('HELP_REMOVECHORD'),
    chordlist: () => i18n.t('HELP_CHORDLIST'),
    sendnote: () => i18n.t('HELP_SENDNOTE'),
    sendchord: () => i18n.t('HELP_SENDCHORD'),
    sendloop: () => i18n.t('HELP_SENDLOOP'),
    sendcc: () => i18n.t('HELP_SENDCC'),
    cclist: () => i18n.t('HELP_CCLIST'),
    midivolume: () => i18n.t('HELP_MIDIVOLUME'),
    stoploop: () => i18n.t('HELP_STOPLOOP'),
    fullstopmidi: () => i18n.t('HELP_FULLSTOPMIDI'),
    settempo: () => i18n.t('HELP_SETTEMPO'),
    syncmidi: () => i18n.t('HELP_SYNCMIDI'),
    fetchdb: () => i18n.t('HELP_FETCHDB'),
    midicurrentrequest: () => i18n.t('HELP_MIDICURRENTREQUEST'),
    midirequestqueue: () => i18n.t('HELP_MIDIREQUESTQUEUE'),
    midipause: () => i18n.t('HELP_MIDIPAUSE'),
    midiresume: () => i18n.t('HELP_MIDIRESUME')
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
