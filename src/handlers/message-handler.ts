import { ChatClient } from '@twurple/chat';
import { TwitchPrivateMessage } from '@twurple/chat/lib/commands/TwitchPrivateMessage';
import { ALIAS_MAP, COMMANDS, ERROR_MSG, SAFE_COMMANDS } from '../configuration/constants';
import { CommandHandler, CommandType, MessageHandler } from '../types/message-types';
import { getCommand, getCommandContent } from '../utils/message-utils';
import {
    addChordAlias,
    disableMidi,
    fetchDBs,
    fullStop,
    getChordList,
    initMidi,
    removeChordAlias,
    sendCCMessage,
    sendMIDIChord,
    sendMIDILoop,
    sendMIDINote,
    setMidiTempo,
    setVolume,
    stopMIDILoop,
    syncMidi
} from './midi-handler';

export const onMessageHandlerClosure = (chatClient: ChatClient, targetMidiName: string, targetMidiChannel: number, rewardsMode = false): MessageHandler => {
    const onMessageMap: Record<CommandType, CommandHandler> = {
        [COMMANDS.MIDI_ON]: async (channel, user, message, userInfo) => {
            const { isMod, isBroadcaster } = userInfo;
            if (isMod || isBroadcaster) {
                await initMidi(targetMidiName);
                chatClient.say(channel, 'MIDI magic enabled!');
            } else {
                chatClient.say(channel, 'Meeeec, you do not have enough permissions');
            }
        },
        [COMMANDS.MIDI_OFF]: async (channel, user, message, userInfo) => {
            const { isMod, isBroadcaster } = userInfo;
            if (isMod || isBroadcaster) {
                await disableMidi();
                chatClient.say(channel, 'MIDI magic disabled!');
            } else {
                chatClient.say(channel, 'Meeeec, you do not have enough permissions');
            }
        },
        [COMMANDS.MIDI_VOLUME]: (channel, user, message) => {
            const volume = setVolume(message);
            chatClient.say(channel, 'Volume set to ' + String(volume) + '%');
        },
        [COMMANDS.SET_TEMPO]: (channel, user, message) => {
            const tempo = setMidiTempo(message);
            chatClient.say(channel, 'Tempo set to ' + String(tempo));
        },
        [COMMANDS.SEND_NOTE]: (channel, user, message) => {
            chatClient.say(channel, 'Note sent! ');
            sendMIDINote(message, targetMidiChannel);
        },
        [COMMANDS.SEND_CC]: (channel, user, message, userInfo) => {
            if (!userInfo.isSubscriber && !userInfo.isBroadcaster && !userInfo.isMod) {
                throw new Error(ERROR_MSG.INSUFFICIENT_PERMISSIONS);
            }
            const ccMessageList = sendCCMessage(message, targetMidiChannel);
            const [first, ...restOfControllers] = [...new Set(ccMessageList.map(([controller]) => controller))] as number[];
            const controllerListString = restOfControllers.reduce((acc, curr) => `${acc}, CC#${curr}`, `CC#${first}`);

            chatClient.say(channel, `Control Change (${controllerListString}) message(s) sent! `);
        },
        [COMMANDS.SEND_CHORD]: async (channel, user, message) => {
            chatClient.say(channel, 'Chord progression enqueued! ');
            await sendMIDIChord(message, targetMidiChannel);
        },
        [COMMANDS.ADD_CHORD_ALIAS]: async (channel, user, message) => {
            await addChordAlias(message);
            chatClient.say(channel, 'Chord progression saved! ');
        },
        [COMMANDS.REMOVE_CHORD_ALIAS]: async (channel, user, message) => {
            await removeChordAlias(message);
            chatClient.say(channel, 'Chord progression removed! ');
        },
        [COMMANDS.GET_CHORD_LIST]: (channel) => {
            const chordProgressionList = getChordList();
            chatClient.say(channel, 'Here is the list of saved chord progresison/loop:');
            for (const [alias, chordProgression] of chordProgressionList) {
                chatClient.say(channel, `🎵${alias}🎵:🎼${chordProgression}🎼`);
            }
        },
        [COMMANDS.SEND_LOOP]: async (channel, user, message) => {
            chatClient.say(channel, 'Loop enqueued! ');
            await sendMIDILoop(message, targetMidiChannel);
        },
        [COMMANDS.STOP_LOOP]: (channel) => {
            stopMIDILoop();
            chatClient.say(channel, 'Dequeuing loop.. Done! ');
        },
        [COMMANDS.FULL_STOP]: (channel, user, message, userInfo) => {
            const { isMod, isBroadcaster } = userInfo;
            if (isMod || isBroadcaster) {
                fullStop();
                chatClient.say(channel, 'Stopping all MIDI... Done!');
            } else {
                chatClient.say(channel, 'Ask a mod to run this command');
            }
        },
        [COMMANDS.SYNC]: (channel) => {
            syncMidi();
            chatClient.say(channel, "Let's fix this mess... Done!");
        },
        [COMMANDS.FETCH_DB]: async (channel, user, message, userInfo) => {
            const { isBroadcaster } = userInfo;
            if (!isBroadcaster) {
                return;
            }
            await fetchDBs();
            chatClient.say(channel, 'MIDI lists updated!');
        }
    };

    return async (channel: string, user: string, message: string, msg?: TwitchPrivateMessage): Promise<void> => {
        const commandMessage = getCommand(message);
        // Ignore messages that are not commands
        if (commandMessage == null) {
            return;
        }
        try {
            // Try to get the function directly or look up by alias
            const handler = onMessageMap?.[commandMessage] ?? onMessageMap?.[ALIAS_MAP[commandMessage]];
            const processedMessage = getCommandContent(message);

            // If rewards mode enabled and not streamer or mod, disallow everything
            if (rewardsMode && !msg?.userInfo.isBroadcaster && !msg?.userInfo.isMod && !SAFE_COMMANDS[commandMessage] && !SAFE_COMMANDS[ALIAS_MAP[commandMessage]]) {
                return;
            }

            // If no user info was provided, this is is Channel Points/Rewards mode, so there's no block
            await handler?.(channel, user, processedMessage, msg?.userInfo ?? { isBroadcaster: true, isMod: false, isSubscriber: true });
        } catch (error) {
            chatClient.say(channel, String(error));
        }
        return;
    };
};
