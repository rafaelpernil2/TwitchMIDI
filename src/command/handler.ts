import { setTimeoutPromise } from '../utils/promise';
import { CHORD_PROGRESSIONS } from '../database/jsondb/types';
import { ResponseStatus } from '../database/interface';
import { ALIASES_DB, ALIAS_MAP, Command, COMMAND_DESCRIPTIONS, CONFIG, ERROR_MSG, GLOBAL, PERMISSIONS_DB, REWARDS_DB } from '../configuration/constants';
import { clearQueue, queue, clearQueueList, currentTurnMap, isQueueEmpty, rollbackClearQueue } from './queue';
import { isValidCommand, firstMessageValue, getCCCommandList, processCCCommandList, getChordProgression, parseNoteList } from './utils';
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
    triggerNoteList,
    triggerChordList,
    initVariables
} from '../midi/handler';

/**
 * Shows all available commands and explains how to use them
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function midihelp(...[message, , { chatClient, channel }]: CommandParams): void {
    const commandToTest = firstMessageValue(message);
    if (isValidCommand(commandToTest)) {
        chatClient.say(channel, `🟡Command info!🟡 !${commandToTest}: ${COMMAND_DESCRIPTIONS[commandToTest] ?? COMMAND_DESCRIPTIONS[ALIAS_MAP[commandToTest]]}`);
    } else {
        chatClient.say(channel, '🟣TwitchMIDI available commands - Use "!midihelp yourcommand" for more info🟣: ' + Object.values(Command).join());
    }
}

/**
 * Initializes MIDI connectivity and allows the bot to work
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
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
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
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
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
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
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
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
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
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
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function sendnote(...[message, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): void {
    chatClient.say(channel, 'Note sent! ');
    checkMIDIConnection();
    const noteList = parseNoteList(message, tempo.get());
    for (const [note, timeout] of noteList) {
        triggerNoteList(note, timeout, targetMIDIChannel);
    }
}

/**
 * Parses and sends a chord progression with chords separated by space or with an alias
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export async function sendchord(...[message, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): Promise<void> {
    chatClient.say(channel, 'Chord progression enqueued! ');
    checkMIDIConnection();
    // Lookup previously saved chord progressions
    const rawChordProgression = getChordProgression(message);

    // If a chord progression is requested, we clear the loop queue
    if (isQueueEmpty(Command.sendchord)) {
        clearQueue(Command.sendloop);
    }
    const myTurn = queue(rawChordProgression, Command.sendchord);

    await triggerChordList(rawChordProgression, targetMIDIChannel, Command.sendchord, myTurn);

    // Once the chord queue is empty, we go back to the loop queue
    if (isQueueEmpty(Command.sendchord)) {
        rollbackClearQueue(Command.sendloop);
    }
}

/**
 * Parses and sends a chord progression as a loop with chords separated by space or with an alias
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export async function sendloop(...[message, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): Promise<void> {
    checkMIDIConnection();
    // Queue chord progression petition
    const chordProgression = getChordProgression(message);
    const myTurn = queue(chordProgression, Command.sendloop);

    chatClient.say(channel, 'Loop enqueued! ');
    do {
        // Execute at least once to wait for your turn in the queue
        await triggerChordList(chordProgression, targetMIDIChannel, Command.sendloop, myTurn);
    } while (myTurn === currentTurnMap.sendloop);
}

/**
 * Sends a particular CC Message, a list of CC messages separated by comma or a set of commands using an alias
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function sendcc(...[message, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): void {
    const rawCCCommandList = getCCCommandList(message);
    const ccCommandList = processCCCommandList(rawCCCommandList);

    triggerCCCommandList(ccCommandList, targetMIDIChannel);
    const ccMessageList = rawCCCommandList;
    const controllerList = removeDuplicates(ccMessageList.map(([controller]) => controller));
    chatClient.say(channel, `Control Change (${controllerList.join()}) message(s) sent! `);
}

/**
 * Obtains the list of Control Change (CC) actions saved and returns it
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function cclist(...[, , { chatClient, channel }]: CommandParams): void {
    const commands = Object.keys(ALIASES_DB.value?.ccCommands ?? {});
    chatClient.say(channel, '🟠Here is the list of saved Control Change (CC) actions🟠: ' + commands.join());
}

/**
 * Sets the MIDI velocity (volume) for the chord progression/loop/note
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function midivolume(...[message, , { chatClient, channel }]: CommandParams): void {
    const value = parseInt(firstMessageValue(message));
    if (isNaN(value) || value < 0 || value > 100) {
        throw new Error(ERROR_MSG.INVALID_VOLUME);
    }
    // Convert to range 0-127
    volume.set(Math.floor(value * 1.27));
    chatClient.say(channel, 'Volume set to ' + String(value) + '%');
}

/**
 * Stops the MIDI loop on the next beat
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function stoploop(...[, , { chatClient, channel }]: CommandParams): void {
    clearQueueList(Command.sendchord, Command.sendloop);

    chatClient.say(channel, 'Dequeuing loop.. Done! ');
}

/**
 * Stops sound, MIDI clock and MIDI loop
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function fullstopmidi(...[, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): void {
    stopAllMidi(targetMIDIChannel);
    chatClient.say(channel, 'Stopping all MIDI... Done!');
}

/**
 * Sets a partitular tempo and starts playing
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function settempo(...[message, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): void {
    const newTempo = Number(firstMessageValue(message));
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
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export function syncmidi(...[, { targetMIDIChannel }, { chatClient, channel }]: CommandParams): void {
    triggerClock(targetMIDIChannel, tempo.get());
    chatClient.say(channel, "Let's fix this mess... Done!");
}

/**
 * Fetches data from the alias and rewards database, refreshing the copy in memory
 * @param [message, // Command arguments
 *         common: {targetMIDIName, targetMIDIChannel}, // Configuration parameters
 *         twitch: { chatClient, channel, user, userRoles } // Twitch chat and user data
 *         ]
 */
export async function fetchdb(...[, , { chatClient, channel }]: CommandParams): Promise<void> {
    await ALIASES_DB.fetchDB();
    await REWARDS_DB.fetchDB();
    await PERMISSIONS_DB.fetchDB();
    chatClient.say(channel, 'MIDI lists updated!');
}
