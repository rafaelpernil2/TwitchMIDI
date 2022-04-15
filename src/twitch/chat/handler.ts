import { ChatClient } from '@twurple/chat';
import { TwitchPrivateMessage } from '@twurple/chat/lib/commands/TwitchPrivateMessage';
import { ALIAS_MAP, Command, CONFIG, SAFE_COMMANDS } from '../../configuration/constants';
import { CommandHandlerType, MessageHandler, TwitchParams } from './types';
import { getCommand, getArguments } from '../../command/utils';
import * as CommandHandlers from '../../command/handler';
import { canAccessCommand } from '../../command/guards';

/**
 * A closure that returns a ChatClient onMessageHandler to call the commands and provide access control
 * @param chatClient Twitch ChatClient
 * @param targetMIDIName Virtual MIDI device name
 * @param targetMIDIChannel Virtual MIDI device channel
 * @param rewardsMode Is rewards mode on?
 * @param vipRewardsMode Is VIP rewards mode on?
 * @returns A ChatClient MessageHandler
 */
export const onMessageHandlerClosure = (chatClient: ChatClient, targetMIDIName: string, targetMIDIChannel: number, rewardsMode = false, vipRewardsMode = false): MessageHandler => {
    return async (channel: string, user: string, message: string, msg?: TwitchPrivateMessage): Promise<void> => {
        const commandMessage = getCommand(message);
        // Ignore messages that are not commands
        if (commandMessage == null) {
            return;
        }
        try {
            // Try to get the function directly or look up by alias
            const parsedCommand = ALIAS_MAP[commandMessage] ?? commandMessage;
            const commandHandler = CommandHandlers[parsedCommand] as CommandHandlerType;

            // If rewards mode enabled and the input is a command and the user is not streamer or mod or vip, only allow safe commands
            if (commandHandler == null || isUnauthorizedCommand(commandMessage, msg, rewardsMode, vipRewardsMode)) {
                return;
            }

            // If no user info was provided, this is is Channel Points/Rewards mode, so there's no block
            const twitch: TwitchParams = { channel, chatClient, user, userRoles: msg?.userInfo ?? CONFIG.FULL_ACCESS_USER_ROLES };
            // Checks if the user has enough permissions
            canAccessCommand(parsedCommand, twitch);
            await commandHandler(getArguments(message), { targetMIDIChannel, targetMIDIName }, twitch);
        } catch (error) {
            chatClient.say(channel, String(error));
        }
        return;
    };
};

/**
 * Checks rewardsMode/vipRewardsMode to assess if a command can be executed via commands
 * @param commandMessage Command message
 * @param msg Twitch data
 * @param rewardsMode Is rewards mode on?
 * @param vipRewardsMode Is VIP rewards mode on?
 * @returns
 */
function isUnauthorizedCommand(commandMessage: Command, msg?: TwitchPrivateMessage, rewardsMode = false, vipRewardsMode = false): boolean {
    return (
        rewardsMode &&
        !msg?.userInfo.isBroadcaster &&
        !msg?.userInfo.isMod &&
        (!msg?.userInfo.isVip || !vipRewardsMode) &&
        !SAFE_COMMANDS[commandMessage] &&
        !SAFE_COMMANDS[ALIAS_MAP[commandMessage]]
    );
}
