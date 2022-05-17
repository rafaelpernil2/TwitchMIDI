import { ResponseStatus } from '../database/interface';
import { ALIASES_DB, COMMAND_DESCRIPTIONS, CONFIG, ERROR_MSG, EVENT, EVENT_EMITTER, GLOBAL, PERMISSIONS_DB, REWARDS_DB, TOGGLE_MIDI_VALUES } from '../configuration/constants';
import { clearQueue, queue, clearQueueList, currentTurnMap, isQueueEmpty, rollbackClearQueue, getCurrentRequestPlaying, getRequestQueue } from './queue';
import { isValidCommand, deAliasCommand, splitCommandArguments } from './utils';
import { CommandParams } from '../twitch/chat/types';
import { removeDuplicates } from '../utils/generic';
import {
    checkMIDIConnection,
    connectMIDI,
    disconnectMIDI,
    triggerCCCommandList,
    stopAllMidi,
    triggerClock,
    triggerChordList,
    triggerNoteList,
    setMIDIVolume
} from '../midi/handler';
import { CCCommand, Command } from './types';
import { inlineChord } from 'harmonics';
import { CC_COMMANDS, CC_CONTROLLERS, CHORD_PROGRESSIONS } from '../database/jsondb/types';
import { ChatClient } from '@twurple/chat/lib/ChatClient';
import { createRewards, toggleRewardsStatus } from '../rewards/handler';
import { areRequestsOpen } from './guards';
import i18n from '../i18n/loader';

/**
 * Shows all available commands and explains how to use them
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function midihelp(...[message, , { chatClient, channel }]: CommandParams): void {
    const [commandToTest] = splitCommandArguments(message);
    if (isValidCommand(commandToTest)) {
        chatClient.say(channel, `${i18n.t('MIDIHELP_VALID')} !${commandToTest}: ${COMMAND_DESCRIPTIONS[deAliasCommand(commandToTest)]()}`);
    } else {
        chatClient.say(channel, i18n.t('MIDIHELP_INVALID') + ' ' + Object.values(Command).join(GLOBAL.COMMA_JOIN));
    }
}

/**
 * Initializes MIDI connectivity and allows the bot to work
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export async function midion(...[, { targetMIDIName, isRewardsMode }, { chatClient, authProvider, channel, broadcasterUser }]: CommandParams): Promise<void> {
    try {
        await connectMIDI(targetMIDIName);
        if (isRewardsMode) {
            chatClient.say(channel, i18n.t('MIDION_REWARDS'));
            await createRewards(authProvider, broadcasterUser);
            await toggleRewardsStatus(authProvider, broadcasterUser, { isEnabled: true });
        }
        EVENT_EMITTER.on(EVENT.PLAYING_NOW, _onPlayingNowChange(chatClient, channel));
        areRequestsOpen.set(true);
        console.log(i18n.t('MIDION_LOG_ENABLED'));
    } catch (error) {
        throw new Error(ERROR_MSG.MIDI_CONNECTION_ERROR());
    }
    chatClient.say(channel, `${i18n.t('MIDION_ENABLED')} Rafael Pernil (@rafaelpernil2)`);
}

/**
 * Disables MIDI connectivity and stops all MIDI
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export async function midioff(...[, { targetMIDIChannel, isRewardsMode }, { chatClient, authProvider, channel, broadcasterUser }]: CommandParams): Promise<void> {
    chatClient.say(channel, i18n.t('MIDIOFF_INIT'));
    try {
        await disconnectMIDI(targetMIDIChannel);
        if (isRewardsMode) {
            chatClient.say(channel, i18n.t('MIDIOFF_REWARDS'));
            await toggleRewardsStatus(authProvider, broadcasterUser, { isEnabled: false });
        }
        EVENT_EMITTER.removeAllListeners(EVENT.PLAYING_NOW);
        areRequestsOpen.set(false);
        console.log(i18n.t('MIDIOFF_LOG_DISABLED'));
    } catch (error) {
        throw new Error(ERROR_MSG.MIDI_DISCONNECTION_ERROR());
    }
    chatClient.say(channel, i18n.t('MIDIOFF_DISABLED'));
}

/**
 * Pauses TwitchMIDI to stop users from requesting
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function midipause(...[, , { chatClient, channel }]: CommandParams): void {
    areRequestsOpen.set(false);
    chatClient.say(channel, i18n.t('MIDIPAUSE'));
}

/**
 * Resumes TwitchMIDI to allow users to request again
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function midiresume(...[, , { chatClient, channel }]: CommandParams): void {
    areRequestsOpen.set(true);
    chatClient.say(channel, i18n.t('MIDIRESUME'));
}
/**
 * Saves a chord progresion with an alias to be used later
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export async function addchord(...[message, , { chatClient, channel }]: CommandParams): Promise<void> {
    const [alias, ...chordProgressionTokens] = message.split(GLOBAL.SLASH_SEPARATOR).map((str) => str.trim());
    const chordProgression = chordProgressionTokens.join(GLOBAL.SLASH_SEPARATOR);

    const insertStatus = ALIASES_DB.insertUpdate(CHORD_PROGRESSIONS, { [alias.toLowerCase()]: chordProgression });
    if (insertStatus === ResponseStatus.Error) {
        throw new Error(ERROR_MSG.CHORD_PROGRESSION_BAD_INSERTION());
    }
    await ALIASES_DB.commit();
    chatClient.say(channel, i18n.t('ADDCHORD'));
}

/**
 * Removes a chord progression saved with an alias
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export async function removechord(...[message, , { chatClient, channel }]: CommandParams): Promise<void> {
    const parsedAlias = message.toLowerCase();
    const status = ALIASES_DB.delete(CHORD_PROGRESSIONS, parsedAlias);
    if (status === ResponseStatus.Error) {
        throw new Error(ERROR_MSG.CHORD_PROGRESSION_NOT_FOUND());
    }
    await ALIASES_DB.commit();
    chatClient.say(channel, i18n.t('REMOVECHORD'));
}

/**
 * Obtains the list of chord progressions saved and returns it
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function chordlist(...[message, , { chatClient, channel }]: CommandParams): void {
    // Case with alias to lookup
    const aliasToLookup = message.toLowerCase();
    const chordProgression = ALIASES_DB.select(CHORD_PROGRESSIONS, message);
    if (aliasToLookup !== GLOBAL.EMPTY_MESSAGE && chordProgression != null) {
        chatClient.say(channel, `🎵${aliasToLookup}🎵:🎼${chordProgression}🎼`);
        return;
    }
    // Default case showing all
    const chordProgressionList = Object.entries(ALIASES_DB.value?.chordProgressions ?? {});
    chatClient.say(channel, i18n.t('CHORDLIST_DEFAULT'));
    for (const [alias, chordProgression] of chordProgressionList) {
        chatClient.say(channel, `🎵${alias}🎵:🎼${chordProgression}🎼`);
    }
}

/**
 * Sends a set of MIDI notes separated by spaces or a melody separated by commas
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export async function sendnote(...[message, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): Promise<void> {
    checkMIDIConnection();
    const requestList = message.split(GLOBAL.COMMA_SEPARATOR).map((request) => _getNoteList(request));
    chatClient.say(channel, i18n.t('SENDNOTE'));
    for (const request of requestList) {
        await triggerNoteList(request, targetMIDIChannel);
    }
}

/**
 * Parses and sends a chord progression with chords separated by space or with an alias
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export async function sendchord(...[message, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): Promise<void> {
    checkMIDIConnection();
    // Lookup previously saved chord progressions
    const chordProgression = _getChordProgression(message);

    // If a chord progression is requested, we clear the loop queue
    if (isQueueEmpty(Command.sendchord)) {
        clearQueue(Command.sendloop, { backup: true });
    }
    const myTurn = queue(message, Command.sendchord);
    chatClient.say(channel, i18n.t('SENDCHORD'));

    await triggerChordList(chordProgression, targetMIDIChannel, Command.sendchord, myTurn);

    // Once the chord queue is empty, we go back to the loop queue
    if (isQueueEmpty(Command.sendchord)) {
        rollbackClearQueue(Command.sendloop);
    }
}

/**
 * Parses and sends a chord progression as a loop with chords separated by space or with an alias
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export async function sendloop(...[message, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): Promise<void> {
    checkMIDIConnection();
    // Queue chord progression petition
    const chordProgression = _getChordProgression(message);
    const myTurn = queue(message, Command.sendloop);

    chatClient.say(channel, i18n.t('SENDLOOP'));
    do {
        // Execute at least once to wait for your turn in the queue
        await triggerChordList(chordProgression, targetMIDIChannel, Command.sendloop, myTurn);
    } while (myTurn === currentTurnMap.sendloop);
}

/**
 * Sends a particular CC Message, a list of CC messages separated by comma or a set of commands using an alias
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function sendcc(...[message, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): void {
    checkMIDIConnection();
    const ccCommandList = _getCCCommandList(message);

    triggerCCCommandList(ccCommandList, targetMIDIChannel);

    const controllerList = removeDuplicates(ccCommandList.map(([controller]) => controller)).join(GLOBAL.COMMA_JOIN);
    chatClient.say(channel, `${i18n.t('SENDCC_1')}${controllerList}${i18n.t('SENDCC_2')}`);
}

/**
 * Shows the current chord progression or loop request being played
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function midicurrentrequest(...[, , { chatClient, channel }]: CommandParams): void {
    const currentRequestPlaying = getCurrentRequestPlaying();
    if (currentRequestPlaying == null) {
        chatClient.say(channel, i18n.t('MIDICURRENTREQUEST_NOTHING'));
        return;
    }
    chatClient.say(channel, _buildPlayingNowMessage(currentRequestPlaying.type, currentRequestPlaying.request));
}

/**
 * Shows the current chord progression or loop request queue
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function midirequestqueue(...[, , { chatClient, channel }]: CommandParams): void {
    const requestList = getRequestQueue()
        .map(([type, request]) => `!${type} "${request}"`)
        .join(GLOBAL.COMMA_JOIN);
    chatClient.say(channel, i18n.t('MIDIREQUESTQUEUE_OK') + ': ' + (requestList.length === 0 ? i18n.t('MIDIREQUESTQUEUE_EMPTY') : requestList));
}

/**
 * Obtains the list of Control Change (CC) actions saved and returns it
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function cclist(...[, , { chatClient, channel }]: CommandParams): void {
    const commands = Object.keys(ALIASES_DB.value?.ccCommands ?? {});
    chatClient.say(channel, i18n.t('CCLIST') + ': ' + commands.join(GLOBAL.COMMA_JOIN));
}

/**
 * Sets the MIDI velocity (volume) for the chord progression/loop/note
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function midivolume(...[message, , { chatClient, channel }]: CommandParams): void {
    const value = parseInt(splitCommandArguments(message)[0]);
    // Convert to range 0-127
    setMIDIVolume(value);
    chatClient.say(channel, i18n.t('MIDIVOLUME') + ' ' + String(value) + '%');
    if (value === 69) {
        chatClient.say(channel, i18n.t('EASTEREGG_69'));
    }
}

/**
 * Stops the MIDI loop on the next beat
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function stoploop(...[, , { chatClient, channel }]: CommandParams): void {
    clearQueueList(Command.sendchord, Command.sendloop);
    chatClient.say(channel, i18n.t('STOPLOOP'));
}

/**
 * Stops sound, MIDI clock and MIDI loop
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function fullstopmidi(...[, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): void {
    stopAllMidi(targetMIDIChannel);
    chatClient.say(channel, i18n.t('FULLSTOPMIDI'));
}

/**
 * Sets a partitular tempo and starts playing
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function settempo(...[message, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): void {
    const newTempo = Number(splitCommandArguments(message)[0]);
    if (isNaN(newTempo) || newTempo < CONFIG.MIN_TEMPO || newTempo > CONFIG.MAX_TEMPO) {
        throw new Error(ERROR_MSG.INVALID_TEMPO());
    }
    // Generates a MIDI clock
    triggerClock(targetMIDIChannel, newTempo);

    chatClient.say(channel, i18n.t('SETTEMPO') + ' ' + String(newTempo));
    if (Math.floor(newTempo) === 69) {
        chatClient.say(channel, i18n.t('EASTEREGG_69'));
    }
}

/**
 * Syncrhonizes the MIDI clock and the beat. Useful when the instruments are out-of-sync
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function syncmidi(...[, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): void {
    triggerClock(targetMIDIChannel);
    chatClient.say(channel, i18n.t('SYNCMIDI'));
}

/**
 * Fetches data from the alias and rewards database, refreshing the copy in memory
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export async function fetchdb(...[, , { chatClient, channel }]: CommandParams): Promise<void> {
    await ALIASES_DB.fetchDB();
    await REWARDS_DB.fetchDB();
    await PERMISSIONS_DB.fetchDB();
    chatClient.say(channel, i18n.t('FETCHDB'));
}

/**
 * PRIVATE METHODS
 *
 */

/**
 * Processes a list of notes
 * @param message
 * @returns
 */
function _getNoteList(message: string): Array<[note: string, timeSubDivision: number]> {
    const noteList = splitCommandArguments(message);
    return noteList.map(_parseNote);
}

/**
 * Looks up a chord progression/loop or returns the original message if not found
 * @param message Command arguments (alias or chord progression)
 * @returns Chord progression
 */
function _getChordProgression(message: string): Array<[noteList: string[], timeSubDivision: number]> {
    const aliasToLookup = message.toLowerCase();
    const chordProgression = ALIASES_DB.select(CHORD_PROGRESSIONS, aliasToLookup) ?? message;
    // Check everything is okay
    return _parseChordProgression(chordProgression);
}

/**
 * Retrieves a set of CC commands saved for an alias or splits the one sent
 * @param message Alias or CC commands
 * @return List of parsed CC Commands
 */
function _getCCCommandList(message: string): CCCommand[] {
    const aliasToLookup = message.toLowerCase();
    const ccCommandList = ALIASES_DB.select(CC_COMMANDS, aliasToLookup) ?? message.split(GLOBAL.COMMA_SEPARATOR);
    if (ccCommandList.length < 1) {
        throw new Error(ERROR_MSG.BAD_MIDI_MESSAGE());
    }

    const rawCCCommandList = ccCommandList.map(_parseCCCommand);
    return _parseCCCommandList(rawCCCommandList);
}

/**
 * Splits a token into content and time part between parenthesis
 * @param message
 * @returns
 */
function _splitTokenTime(message: string): [token: string, timeDivision: number] {
    const [token, openParenthesisContent = GLOBAL.EMPTY_MESSAGE] = message.split(GLOBAL.OPEN_PARENTHESIS_SEPARATOR);
    const [timeDivision] = openParenthesisContent.split(GLOBAL.CLOSE_PARENTHESIS_SEPARATOR);
    return [token, Number(timeDivision)];
}

/**
 * Parses a note that may or may not contain a MIDI octave at the end
 * @param note Note to parse
 * @returns Valid MIDI note
 */
function _parseNote(note: string): [note: string, timeSubDivision: number] {
    const [preparedNote, timeSubDivision] = _splitTokenTime(note);

    // Prepare and check timeSubDivision
    // Since it is a melody, notes should last a quarter note by default
    const parsedTimeDivision = timeSubDivision === 0 ? 1 : timeSubDivision;

    // If it is a rest, do not parse note
    if (preparedNote.toLowerCase() === GLOBAL.MUSIC_REST_TOKEN) {
        return [GLOBAL.MUSIC_REST_TOKEN, parsedTimeDivision];
    }

    // Prepare and check note
    const lastChar = preparedNote.charAt(preparedNote.length - 1);
    const octave = isNaN(Number(lastChar)) ? CONFIG.DEFAULT_OCTAVE : '';
    const parsedNote = preparedNote + octave;

    if (!_isValidAndBounded(parsedNote, 1)) {
        throw new Error(ERROR_MSG.BAD_MIDI_NOTE());
    }

    // Return
    return [parsedNote, parsedTimeDivision];
}

/**
 * Parses a chord and converts it to "harmonics" module syntax
 * @param chord Chord to parse
 * @returns Parsed chord
 */
function _parseChord(chord: string): string {
    const [parsedChord] = _splitTokenTime(chord);
    if (parsedChord.length === 0) return '';

    // If only a note is provided, it will be transformed into a major chord (e.g CM, EbM...)
    if (_isValidAndBounded(parsedChord, 0)) return parsedChord + 'M';

    // If "min" is used to represent a minor chord, it will be converted to harmonics syntax "m"
    if (parsedChord.includes('min')) {
        const [pre, post] = parsedChord.split('min');
        return pre + 'm' + post;
    }

    // If a 9, 7, 6, 5 or 4 chord is provided but without "th", it will be converted to harmonics syntax "th"
    if (['9', '7', '6', '5', '4'].includes(parsedChord.slice(-1)) && _isValidAndBounded(parsedChord, 1)) return parsedChord + 'th';

    // If a 13 or 11 chord is provided but without "th", it will be converted to harmonics syntax "th"
    if (['13', '11'].includes(parsedChord.slice(-2)) && _isValidAndBounded(parsedChord, 2)) return parsedChord + 'th';

    // Default
    return parsedChord;
}

/**
 * Checks if chord notation contains a valid note + an expected amount of extra characters
 * @param chord Chord to check
 * @param extraChars Amount of extra characters
 * @returns If chord is bounded
 */
function _isValidAndBounded(chord: string, extraChars: number): boolean {
    const maxLength = 2 + extraChars;
    return chord.length === maxLength - 1 || (chord.length === maxLength && (chord.includes('b') || chord.includes('#')));
}

/**
 * Validates a chord progression string to be played in a 4/4 beat
 * @param chordProgression Chord progression separated by spaces
 * @return List of notes to play with their respective release times
 */
function _parseChordProgression(chordProgression: string): Array<[noteList: string[], timeSubDivision: number]> {
    const chordProgressionList = splitCommandArguments(chordProgression);
    return chordProgressionList.map((chord) => {
        try {
            const [chordPart, timeSubDivision] = _splitTokenTime(chord);
            // If it is a rest, do not parse chord
            if (chordPart.toLowerCase() === GLOBAL.MUSIC_REST_TOKEN) return [[GLOBAL.MUSIC_REST_TOKEN], timeSubDivision];

            return [inlineChord(_parseChord(chordPart)), timeSubDivision];
        } catch (error) {
            throw new Error(ERROR_MSG.INVALID_CHORD(chord));
        }
    });
}

/**
 * Validates a control change message and parses it into a tuple with [controller, value, time]
 * If the validation fails, it throws an error
 * @param ccCommand CC command to parse
 * @returns Parsed command
 */
function _parseCCCommand(ccCommand: string): [controller: number, value: number, time: number] {
    const [rawController, rawValue] = ccCommand.toLowerCase().trim().split(GLOBAL.SPACE_SEPARATOR);
    // Controller
    const parsedController = ALIASES_DB.select(CC_CONTROLLERS, rawController) ?? rawController.replace(GLOBAL.CC_CONTROLLER, '');
    const controller = _parseMIDIValue(parsedController);

    // Value
    const [ccValue, time] = _splitTokenTime(rawValue);
    const parsedValue = TOGGLE_MIDI_VALUES[ccValue] ?? ccValue; // Parse toggle values (on/off)
    const value = _parseMIDIValue(parsedValue);

    return [controller, value, time];
}

/**
 * Parses a list of CC commands adding the missing delays for non-sweep commands
 * @param rawCCCommandList List of CC commands
 * @return List of processed CC commands
 */
function _parseCCCommandList(rawCCCommandList: CCCommand[]): CCCommand[] {
    let lastDelay = 0;
    return rawCCCommandList.map((command) => {
        const [controller, value, time] = command;
        lastDelay = lastDelay < time ? time : lastDelay;
        return [controller, value, lastDelay];
    });
}

/**
 * Validates a MIDI message value (0-127)
 * Throws an error if the value is invalid
 * @param midiValue Possible MIDI value
 * @returns
 */
function _parseMIDIValue(midiValue: string | number): number {
    const parsedValue = Number(midiValue);
    if (isNaN(parsedValue) || parsedValue < 0 || parsedValue > 127) {
        throw new Error(ERROR_MSG.BAD_MIDI_MESSAGE() + ': ' + String(midiValue));
    }
    return parsedValue;
}

/**
 * A closure that informs of the current loop or chord progression playing via Twitch chat
 * @param chatClient Twitch ChatClient
 * @param channel Twitch Channel
 * @returns An event handler
 */
function _onPlayingNowChange(chatClient: ChatClient, channel: string): (type: Command, request: string) => void {
    return (type, request) => chatClient.say(channel, _buildPlayingNowMessage(type, request));
}

/**
 * Creates a message to show the request being played right now
 * @param type
 * @param request
 * @returns A message
 */
function _buildPlayingNowMessage(type: Command, request: string): string {
    return `${i18n.t('MIDICURRENTREQUEST_OK')} !${type} "${request}"`;
}
