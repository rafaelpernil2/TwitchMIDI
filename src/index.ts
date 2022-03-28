#!/usr/bin/env node
// This NEEDS to be executed first
import 'dotenv/config';
import * as JZZ from 'jzz';

import { getLoadedEnvVariables } from './configuration/env-loader';
import { getAuthProvider } from './providers/auth-provider';
import { ChatClient } from '@twurple/chat';
import { onMessageHandlerClosure } from './handlers/message-handler';
import { ERROR_MSG, GLOBAL, REWARDS_DB } from './configuration/constants';

import { PubSubClient, PubSubRedemptionMessage } from '@twurple/pubsub';
import { getBooleanByString, validateMIDIChannel } from './utils/data-utils';
import { REWARD_TITLE_COMMAND } from './types/jsondb-types';
import { getCommand } from './utils/message-utils';
import { setupConfiguration } from './handlers/configurator-input-handler';

(async () => {
    const {
        CLIENT_ID,
        CLIENT_SECRET,
        BOT_ACCESS_TOKEN,
        BOT_REFRESH_TOKEN,
        BROADCASTER_ACCESS_TOKEN,
        BROADCASTER_REFRESH_TOKEN,
        TARGET_CHANNEL,
        TARGET_MIDI_NAME,
        TARGET_MIDI_CHANNEL,
        REWARDS_MODE
    } = await getLoadedEnvVariables(setupConfiguration);
    const parsedTargetMIDIChannel = validateMIDIChannel(TARGET_MIDI_CHANNEL);
    try {
        const botAuthProvider = await getAuthProvider(CLIENT_ID, CLIENT_SECRET, BOT_ACCESS_TOKEN, BOT_REFRESH_TOKEN, 'BOT');
        const broadcasterAuthProvider = await getAuthProvider(CLIENT_ID, CLIENT_SECRET, BROADCASTER_ACCESS_TOKEN, BROADCASTER_REFRESH_TOKEN, 'BROADCASTER');

        const chatClient = new ChatClient({ authProvider: botAuthProvider, channels: [TARGET_CHANNEL] });

        await chatClient.connect();
        await JZZ.requestMIDIAccess().catch(() => console.log('First WebMIDI connection'));

        console.log('Bot ready! - Rewards/Channel Points mode: ' + REWARDS_MODE);
        // Chat code
        const isRewardsMode = getBooleanByString(REWARDS_MODE);
        chatClient.onMessage(onMessageHandlerClosure(chatClient, TARGET_MIDI_NAME, parsedTargetMIDIChannel, isRewardsMode));

        // Rewards code
        if (isRewardsMode) {
            const pubSubClient = new PubSubClient();
            const userId = await pubSubClient.registerUserListener(broadcasterAuthProvider);

            await pubSubClient.onRedemption(userId, async (redemption: PubSubRedemptionMessage) => {
                const { rewardTitle, message: args } = redemption;
                // Look up the command
                const command = REWARDS_DB.select(REWARD_TITLE_COMMAND, rewardTitle);

                // For rewards that are not part of this plugin
                if (!command) {
                    return;
                }

                const parsedCommand = getCommand(command);

                // Invalid configuration
                if (parsedCommand == null) {
                    console.log(ERROR_MSG.INVALID_REWARD);
                    return;
                }

                const channel = GLOBAL.POUND + TARGET_CHANNEL;
                const message = command + GLOBAL.SPACE_SEPARATOR + args;

                const callCommand = onMessageHandlerClosure(chatClient, TARGET_MIDI_NAME, parsedTargetMIDIChannel);
                await callCommand(channel, userId, message);
            });
        }
    } catch (error) {
        console.log(ERROR_MSG.TWITCH_API, error);
    }
})();
