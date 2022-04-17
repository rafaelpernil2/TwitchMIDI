import { setTimeoutPromise } from '../utils/promise';
import { ResponseStatus } from '../database/interface';
import { ALIASES_DB, COMMAND_DESCRIPTIONS, CONFIG, ERROR_MSG, GLOBAL, PERMISSIONS_DB, REWARDS_DB, TOGGLE_MIDI_VALUES } from '../configuration/constants';
import { clearQueue, queue, clearQueueList, currentTurnMap, isQueueEmpty, rollbackClearQueue } from './queue';
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
    volume,
    tempo,
    triggerChordList,
    initVariables,
    triggerNoteList
} from '../midi/handler';
import { CCCommand, Command } from './types';
import { inlineChord } from 'harmonics';
import { CC_COMMANDS, CC_CONTROLLERS, CHORD_PROGRESSIONS } from '../database/jsondb/types';

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
        chatClient.say(channel, `🟡Command info!🟡 !${commandToTest}: ${COMMAND_DESCRIPTIONS[deAliasCommand(commandToTest)]}`);
    } else {
        chatClient.say(channel, '🟣TwitchMIDI available commands - Use "!midihelp yourcommand" for more info🟣: ' + Object.values(Command).join(GLOBAL.COMMA_JOIN));
    }
}

/**
 * Initializes MIDI connectivity and allows the bot to work
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export async function midion(...[, { targetMIDIName }, { chatClient, channel }]: CommandParams): Promise<void> {
    try {
        initVariables();
        await connectMIDI(targetMIDIName);
        console.log('MIDI connection stablished!');
    } catch (error) {
        throw new Error(ERROR_MSG.MIDI_CONNECTION_ERROR);
    }
    chatClient.say(channel, 'TwitchMIDI enabled! - Tool developed by Rafael Pernil (@rafaelpernil2)');
}

/**
 * Disables MIDI connectivity and stops all MIDI
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export async function midioff(...[, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): Promise<void> {
    try {
        stopAllMidi(targetMIDIChannel);
        await setTimeoutPromise(3_000_000_000);
        await disconnectMIDI();
        console.log('MIDI disconnected!');
    } catch (error) {
        throw new Error(ERROR_MSG.MIDI_DISCONNECTION_ERROR);
    }
    chatClient.say(channel, 'TwitchMIDI disabled! - Tool developed by Rafael Pernil (@rafaelpernil2)');
}

/**
 * Saves a chord progresion with an alias to be used later
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export async function addchord(...[message, , { chatClient, channel }]: CommandParams): Promise<void> {
    const [alias, chordProgression] = message.split(GLOBAL.SLASH_SEPARATOR);
    const insertStatus = ALIASES_DB.insertUpdate(CHORD_PROGRESSIONS, { [alias.toLowerCase()]: chordProgression });
    if (insertStatus === ResponseStatus.Error) {
        throw new Error(ERROR_MSG.CHORD_PROGRESSION_BAD_INSERTION);
    }
    await ALIASES_DB.commit();
    chatClient.say(channel, 'Chord progression saved! ');
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
        throw new Error(ERROR_MSG.CHORD_PROGRESSION_NOT_FOUND);
    }
    await ALIASES_DB.commit();
    chatClient.say(channel, 'Chord progression removed! ');
}

/**
 * Obtains the list of chord progressions saved and returns it
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function chordlist(...[, , { chatClient, channel }]: CommandParams): void {
    const chordProgressionList = Object.entries(ALIASES_DB.value?.chordProgressions ?? {});
    chatClient.say(channel, '🔵Here is the list of saved chord progresison/loop🔵:');
    for (const [alias, chordProgression] of chordProgressionList) {
        chatClient.say(channel, `🎵${alias}🎵:🎼${chordProgression}🎼`);
    }
}

/**
 * Sends a set of MIDI notes separated by spaces
 * @param commandParams [message, // Command arguments
 *         common: { targetMIDIName, targetMIDIChannel }, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function sendnote(...[message, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): void {
    chatClient.say(channel, 'Note sent! ');
    checkMIDIConnection();

    const noteList = _getNoteList(message);
    triggerNoteList(noteList, targetMIDIChannel);
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
        clearQueue(Command.sendloop);
    }
    const myTurn = queue(message, Command.sendchord);
    chatClient.say(channel, 'Chord progression enqueued! ');

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

    chatClient.say(channel, 'Loop enqueued! ');
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
    chatClient.say(channel, `Control Change (${controllerList}) message(s) sent! `);
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
    chatClient.say(channel, '🟠Here is the list of saved Control Change (CC) actions🟠: ' + commands.join(GLOBAL.COMMA_JOIN));
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
    if (isNaN(value) || value < 0 || value > 100) {
        throw new Error(ERROR_MSG.INVALID_VOLUME);
    }
    // Convert to range 0-127
    volume.set(Math.floor(value * 1.27));
    chatClient.say(channel, 'Volume set to ' + String(value) + '%');
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

    chatClient.say(channel, 'Dequeuing loop.. Done! ');
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
    chatClient.say(channel, 'Stopping all MIDI... Done!');
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
        throw new Error(ERROR_MSG.INVALID_TEMPO);
    }
    // Generates a MIDI clock
    triggerClock(targetMIDIChannel, newTempo);
    tempo.set(newTempo);

    chatClient.say(channel, 'Tempo set to ' + String(newTempo));
    if (Math.floor(newTempo) === 69) {
        chatClient.say(channel, 'Nice! (～￣▽￣)～');
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
    triggerClock(targetMIDIChannel, tempo.get());
    chatClient.say(channel, "Let's fix this mess... Done!");
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
    chatClient.say(channel, 'MIDI lists updated!');
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
        throw new Error(ERROR_MSG.BAD_MIDI_MESSAGE);
    }
    return ccCommandList.map(_parseCCCommandList);
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
    const lastChar = preparedNote.charAt(preparedNote.length - 1);
    const octave = isNaN(Number(lastChar)) ? CONFIG.DEFAULT_OCTAVE : '';
    return [preparedNote + octave, timeSubDivision];
}

/**
 * Parses a chord and converts it to "harmonics" module syntax
 * @param chord Chord to parse
 * @returns Parsed chord
 */
function _parseChord(chord: string): string {
    const [parsedChord] = _splitTokenTime(chord);
    if (parsedChord.length === 0) {
        return '';
    }
    // If only a note is provided, it will be transformed into a major chord (e.g CM, EbM...)
    if (parsedChord.length === 1 || (parsedChord.length === 2 && (parsedChord.includes('b') || parsedChord.includes('#')))) {
        return parsedChord + 'M';
    }
    // If "min" is used to represent a minor chord, it will be converted to harmonics syntax "m"
    if (parsedChord.includes('min')) {
        const [pre, post] = parsedChord.split('min');
        return pre + 'm' + post;
    }
    // If a 9,7 or 6 chord is provided but without "th", it will be converted to harmonics syntax "th"
    if (
        ['9', '7', '6'].includes(parsedChord.charAt(parsedChord.length - 1)) &&
        (parsedChord.length < 3 || (parsedChord.length === 3 ? parsedChord.includes('b') || parsedChord.includes('#') : false))
    ) {
        return parsedChord + 'th';
    }
    // Default
    return parsedChord;
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
function _parseCCCommandList(ccCommand: string): [controller: number, value: number, time: number] {
    const [rawController, rawValue] = ccCommand.toLowerCase().split(GLOBAL.SPACE_SEPARATOR);
    // Controller
    const parsedController = ALIASES_DB.select(CC_CONTROLLERS, rawController) ?? rawController.replace(GLOBAL.CC_CONTROLLER, '');
    const controller = _parseMIDIValue(parsedController);

    // Value
    const [ccValue, rawTimeDivision] = _splitTokenTime(rawValue);
    const parsedValue = TOGGLE_MIDI_VALUES[ccValue] ?? ccValue; // Parse toggle values (on/off)
    const value = _parseMIDIValue(parsedValue);

    // Time
    const time = Number(rawTimeDivision || '0'); // Time to add in ms

    return [controller, value, time];
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
        throw new Error(ERROR_MSG.BAD_MIDI_MESSAGE + ': ' + String(midiValue));
    }
    return parsedValue;
}
