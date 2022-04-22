import { ChatClient } from '@twurple/chat';
import { TwitchPrivateMessage } from '@twurple/chat/lib/commands/TwitchPrivateMessage';
import { CONFIG, GLOBAL, SAFE_COMMANDS } from '../../configuration/constants';
import { CommandHandlerType, MessageHandler, TwitchParams } from './types';
import { getCommand } from '../../command/utils';
import * as CommandHandlers from '../../command/handler';
import { checkCommandAccess } from '../../command/guards';
import { Command } from '../../command/types';
import { ParsedEnvVariables } from '../../configuration/env/types';

/**
 * A closure that returns a ChatClient onMessageHandler to call the commands and provide access control
 * @param chatClient Twitch ChatClient
 * @param env { REWARDS_MODE, VIP_REWARDS_MODE, TARGET_MIDI_NAME, TARGET_MIDI_CHANNEL }
 * @returns A ChatClient MessageHandler
 */
export const onMessageHandlerClosure = (chatClient: ChatClient, { REWARDS_MODE, VIP_REWARDS_MODE, TARGET_MIDI_NAME, TARGET_MIDI_CHANNEL }: ParsedEnvVariables): MessageHandler => {
    return async (channel: string, user: string, message: string, msg?: TwitchPrivateMessage): Promise<void> => {
        const [command, args = GLOBAL.EMPTY_MESSAGE] = getCommand(message);
        // Ignore messages that are not commands
        if (command == null) {
            return;
        }
        try {
            const commandHandler = CommandHandlers[command] as CommandHandlerType;
            // If rewards mode enabled and the input is a command and the user is not streamer or mod or vip, only allow safe commands
            if (commandHandler == null || _isUnauthorizedCommand(command, [REWARDS_MODE, VIP_REWARDS_MODE], msg)) {
                return;
            }

            // If no user info was provided, this is is Channel Points/Rewards mode, so there's no block
            const twitch: TwitchParams = { channel, chatClient, user, userRoles: msg?.userInfo ?? CONFIG.FULL_ACCESS_USER_ROLES };
            // Checks if the user has enough permissions
            checkCommandAccess(command, twitch);
            await commandHandler(args, { targetMIDIChannel: TARGET_MIDI_CHANNEL, targetMIDIName: TARGET_MIDI_NAME }, twitch);
        } catch (error) {
            chatClient.say(channel, String(error));
        }
    };
};

/**
 * Checks rewardsMode/vipRewardsMode to assess if a command can be executed via commands
 * @param command Command message
 * @param modes [rewardsMode, vipRewardsMode] Is Rewards mode/ Is VIP rewards mode
 * @param msg Twitch data
 * @returns
 */
function _isUnauthorizedCommand(
    command: Command,
    [rewardsMode = false, vipRewardsMode = false]: [rewardsMode: boolean, vipRewardsMode: boolean],
    msg?: TwitchPrivateMessage
): boolean {
    return rewardsMode && !msg?.userInfo.isBroadcaster && !msg?.userInfo.isMod && (!msg?.userInfo.isVip || !vipRewardsMode) && !SAFE_COMMANDS[command];
}
