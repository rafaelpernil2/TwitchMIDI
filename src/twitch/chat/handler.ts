import { ChatClient } from '@twurple/chat';
import { TwitchPrivateMessage } from '@twurple/chat/lib/commands/TwitchPrivateMessage';
import { ALIAS_MAP, COMMANDS, COMMAND_DESCRIPTIONS, GLOBAL, SAFE_COMMANDS } from '../../configuration/constants';
import { CommandHandler, CommandType, MessageHandler } from './types';
import { firstMessageValue, getCommand, getCommandContent, isValidCommand } from './utils';
import {
    addchord,
    midioff,
    fetchdb,
    fullstopmidi,
    cclist,
    chordlist,
    midion,
    removechord,
    sendcc,
    sendchord,
    sendloop,
    sendnote,
    miditempo,
    midivolume,
    stoploop,
    syncmidi
} from '../../midi/handler';

export const onMessageHandlerClosure = (chatClient: ChatClient, targetMidiName: string, targetMidiChannel: number, rewardsMode = false, vipRewardsMode = false): MessageHandler => {
    const onMessageMap: Record<CommandType, CommandHandler> = {
        [COMMANDS.MIDI_HELP]: (channel, user, message) => {
            const commandToTest = firstMessageValue(message);

            if (isValidCommand(commandToTest)) {
                chatClient.say(channel, `🟡Command info!🟡 !${commandToTest}: ${COMMAND_DESCRIPTIONS[commandToTest] ?? COMMAND_DESCRIPTIONS[ALIAS_MAP[commandToTest]]}`);
            } else {
                const [first, ...restOfCommands] = Object.values(COMMANDS);
                chatClient.say(
                    channel,
                    '🟣TwitchMIDI available commands - Use "!midihelp yourcommand" for more info🟣: ' + restOfCommands.reduce<string>((acc, curr) => `${acc}, ${curr}`, first)
                );
            }
        },
        [COMMANDS.MIDI_ON]: async (channel, user, message, userInfo) => {
            const { isMod, isBroadcaster } = userInfo;
            if (!isMod && !isBroadcaster) {
                return;
            }
            await midion(targetMidiName);
            chatClient.say(channel, 'TwitchMIDI enabled! - Tool developed by Rafael Pernil (@rafaelpernil2)');
        },
        [COMMANDS.MIDI_OFF]: async (channel, user, message, userInfo) => {
            const { isMod, isBroadcaster } = userInfo;
            if (!isMod && !isBroadcaster) {
                return;
            }
            await midioff(targetMidiChannel);
            chatClient.say(channel, 'TwitchMIDI disabled! - Tool developed by Rafael Pernil (@rafaelpernil2)');
        },
        [COMMANDS.MIDI_VOLUME]: (channel, user, message) => {
            const volume = midivolume(message);
            chatClient.say(channel, 'Volume set to ' + String(volume) + '%');
        },
        [COMMANDS.SET_TEMPO]: (channel, user, message) => {
            const tempo = miditempo(targetMidiChannel, message);
            chatClient.say(channel, 'Tempo set to ' + String(tempo));
        },
        [COMMANDS.SEND_NOTE]: (channel, user, message) => {
            chatClient.say(channel, 'Note sent! ');
            sendnote(message, targetMidiChannel);
        },
        [COMMANDS.SEND_CC]: (channel, user, message) => {
            const ccMessageList = sendcc(message, targetMidiChannel);
            const [first, ...restOfControllers] = [...new Set(ccMessageList.map(([controller]) => controller))] as number[];
            const controllerListString = restOfControllers.reduce((acc, curr) => `${acc}, ${GLOBAL.CC_CONTROLLER}${curr}`, `${GLOBAL.CC_CONTROLLER}${first}`);

            chatClient.say(channel, `Control Change (${controllerListString}) message(s) sent! `);
        },
        [COMMANDS.GET_CC_LIST]: (channel) => {
            const [first, ...restOfCommands] = cclist();
            chatClient.say(channel, '🟠Here is the list of saved Control Change (CC) actions🟠: ' + restOfCommands.reduce<string>((acc, curr) => `${acc}, ${curr}`, first));
        },
        [COMMANDS.SEND_CHORD]: async (channel, user, message) => {
            chatClient.say(channel, 'Chord progression enqueued! ');
            await sendchord(message, targetMidiChannel);
        },
        [COMMANDS.ADD_CHORD_ALIAS]: async (channel, user, message) => {
            await addchord(message);
            chatClient.say(channel, 'Chord progression saved! ');
        },
        [COMMANDS.REMOVE_CHORD_ALIAS]: async (channel, user, message) => {
            await removechord(message);
            chatClient.say(channel, 'Chord progression removed! ');
        },
        [COMMANDS.GET_CHORD_LIST]: (channel) => {
            const chordProgressionList = chordlist();
            chatClient.say(channel, '🔵Here is the list of saved chord progresison/loop🔵:');
            for (const [alias, chordProgression] of chordProgressionList) {
                chatClient.say(channel, `🎵${alias}🎵:🎼${chordProgression}🎼`);
            }
        },
        [COMMANDS.SEND_LOOP]: async (channel, user, message) => {
            chatClient.say(channel, 'Loop enqueued! ');
            await sendloop(message, targetMidiChannel);
        },
        [COMMANDS.STOP_LOOP]: (channel) => {
            stoploop();
            chatClient.say(channel, 'Dequeuing loop.. Done! ');
        },
        [COMMANDS.FULL_STOP]: (channel, user, message, userInfo) => {
            const { isMod, isBroadcaster } = userInfo;
            if (isMod || isBroadcaster) {
                fullstopmidi(targetMidiChannel);
                chatClient.say(channel, 'Stopping all MIDI... Done!');
            } else {
                chatClient.say(channel, 'Ask a mod to run this command');
            }
        },
        [COMMANDS.SYNC]: (channel, user, message, userInfo) => {
            const { isBroadcaster, isMod } = userInfo;
            if (!isMod && !isBroadcaster) {
                return;
            }
            syncmidi(targetMidiChannel);
            chatClient.say(channel, "Let's fix this mess... Done!");
        },
        [COMMANDS.FETCH_DB]: async (channel, user, message, userInfo) => {
            const { isBroadcaster } = userInfo;
            if (!isBroadcaster) {
                return;
            }
            await fetchdb();
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

            // If rewards mode enabled and the input is a command and the user is not streamer or mod or vip, only allow safe commands
            if (
                rewardsMode &&
                !msg?.userInfo.isBroadcaster &&
                !msg?.userInfo.isMod &&
                (!msg?.userInfo.isVip || !vipRewardsMode) &&
                !SAFE_COMMANDS[commandMessage] &&
                !SAFE_COMMANDS[ALIAS_MAP[commandMessage]]
            ) {
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
