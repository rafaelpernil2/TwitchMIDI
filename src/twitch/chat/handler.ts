import { ChatClient } from '@twurple/chat';
import { TwitchPrivateMessage } from '@twurple/chat/lib/commands/TwitchPrivateMessage';
import { ALIAS_MAP, Command, CONFIG, SAFE_COMMANDS } from '../../configuration/constants';
import { CommandHandlerType, MessageHandler, TwitchParams } from './types';
import { getCommand, getCommandContent } from './utils';
import * as CommandHandlers from '../../commands/handler';
import { canAccessCommand } from '../../commands/guards';

export const onMessageHandlerClosure = (chatClient: ChatClient, targetMIDIName: string, targetMIDIChannel: number, rewardsMode = false, vipRewardsMode = false): MessageHandler => {
    return async (channel: string, user: string, message: string, msg?: TwitchPrivateMessage): Promise<void> => {
        const commandMessage = getCommand(message);
        // Ignore messages that are not commands
        if (commandMessage == null) {
            return;
        }
        try {
            // Try to get the function directly or look up by alias
            const commandHandler = CommandHandlers[(ALIAS_MAP[commandMessage] ?? commandMessage) as keyof typeof CommandHandlers] as CommandHandlerType;

            // If rewards mode enabled and the input is a command and the user is not streamer or mod or vip, only allow safe commands
            if (commandHandler == null || isUnauthorizedCommand(commandMessage, msg, rewardsMode, vipRewardsMode)) {
                return;
            }

            // If no user info was provided, this is is Channel Points/Rewards mode, so there's no block
            const twitch: TwitchParams = { channel, chatClient, user, userRoles: msg?.userInfo ?? CONFIG.FULL_ACCESS_USER_ROLES };
            // Checks if the user has enough permissions
            canAccessCommand(commandMessage, twitch);
            await commandHandler(getCommandContent(message), { targetMIDIChannel, targetMIDIName }, twitch);
        } catch (error) {
            chatClient.say(channel, String(error));
        }
        return;
    };
};

function isUnauthorizedCommand(commandMessage: Command, msg?: TwitchPrivateMessage, rewardsMode = false, vipRewardsMode = false) {
    return (
        rewardsMode &&
        !msg?.userInfo.isBroadcaster &&
        !msg?.userInfo.isMod &&
        (!msg?.userInfo.isVip || !vipRewardsMode) &&
        !SAFE_COMMANDS[commandMessage] &&
        !SAFE_COMMANDS[ALIAS_MAP[commandMessage]]
    );
}
