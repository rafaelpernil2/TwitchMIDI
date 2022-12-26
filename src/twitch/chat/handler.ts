import { ChatClient } from '@twurple/chat';
import { CONFIG, ERROR_MSG } from '../../configuration/constants';
import { CommandHandlerType, MessageHandler, RequestSource, TwitchParams } from './types';
import { getCommandList } from '../../command/utils';
import * as CommandHandlers from '../../command/handler';
import { checkCommandAccess } from '../../command/guards';
import { ParsedEnvVariables } from '../../configuration/env/types';
import { RefreshingAuthProvider } from '@twurple/auth';
import { setTimeoutPromise } from '../../utils/promise';

/**
 * A closure that returns a ChatClient onMessageHandler to call the commands and provide access control
 * @param authProvider Broadcaster Authentication Provider
 * @param chatClient Twitch ChatClient
 * @param env Environment variables
 * @param source Request source
 * @returns A ChatClient MessageHandler
 */
export const onMessageHandlerClosure = (authProvider: RefreshingAuthProvider, chatClient: ChatClient, env: ParsedEnvVariables, source: RequestSource): MessageHandler => {
    return async (channel, user, message, msg): Promise<void> => {
        const commandList = getCommandList(message);
        try {
            // Start all tasks asynchronously
            const promiseList = commandList.map(async ([command, args, delayNs]) => {
                // Ignore messages that are not commands
                if (command == null) {
                    return;
                }

                const commandHandler = CommandHandlers[command] as CommandHandlerType;
                // If rewards mode enabled and the input is a command and the user is not streamer or mod or vip, only allow safe commands
                if (commandHandler == null) {
                    return;
                }

                // If no user info was provided, this is is Channel Points/Rewards mode, so there's no block
                const twitch: TwitchParams = {
                    channel,
                    chatClient,
                    authProvider,
                    user,
                    broadcasterUser: env.TARGET_CHANNEL,
                    userRoles: msg?.userInfo ?? CONFIG.DEFAULT_USER_ROLES
                };
                // Checks if the user has enough permissions
                checkCommandAccess(command, twitch, source, env);

                // Delay before instruction
                await setTimeoutPromise(delayNs);

                // Call command
                return commandHandler(
                    args,
                    {
                        targetMIDIChannel: env.TARGET_MIDI_CHANNEL,
                        targetMIDIName: env.TARGET_MIDI_NAME,
                        isRewardsMode: env.REWARDS_MODE
                    },
                    twitch
                );
            });
            // Collect all promises and their errors
            await Promise.all(promiseList);
        } catch (error) {
            // Skip error notification if SEND_UNAUTHORIZED_MESSAGE is false
            if (!(error instanceof Error) || error.message !== ERROR_MSG.BAD_PERMISSIONS() || env.SEND_UNAUTHORIZED_MESSAGE) {
                chatClient.say(channel, String(error));
            }
            // Raise error if it's a reward to handle the redemption status
            if (source === RequestSource.REWARD) throw error;
        }
    };
};
