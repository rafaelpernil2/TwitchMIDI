// This NEEDS to be executed first
import 'dotenv/config';
import * as JZZ from 'jzz';

import { getLoadedEnvVariables } from './configuration/env/loader';
import { getAuthProvider } from './twitch/auth/provider';
import { ChatClient } from '@twurple/chat';
import { onMessageHandlerClosure } from './twitch/chat/handler';
import { ERROR_MSG, GLOBAL, REWARDS_DB } from './configuration/constants';

import { PubSubClient, PubSubRedemptionMessage } from '@twurple/pubsub';
import { getBooleanByString } from './utils/generic';
import { REWARD_TITLE_COMMAND } from './database/jsondb/types';
import { getCommand } from './twitch/chat/utils';
import { setupConfiguration } from './configuration/configurator/setup';
import { validateMIDIChannel } from './midi/utils';

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
        REWARDS_MODE,
        VIP_REWARDS_MODE
    } = await getLoadedEnvVariables(setupConfiguration);
    const parsedTargetMIDIChannel = validateMIDIChannel(TARGET_MIDI_CHANNEL);
    try {
        const botAuthProvider = await getAuthProvider(CLIENT_ID, CLIENT_SECRET, BOT_ACCESS_TOKEN, BOT_REFRESH_TOKEN, 'BOT');
        const broadcasterAuthProvider = await getAuthProvider(CLIENT_ID, CLIENT_SECRET, BROADCASTER_ACCESS_TOKEN, BROADCASTER_REFRESH_TOKEN, 'BROADCASTER');

        const chatClient = new ChatClient({ authProvider: botAuthProvider, channels: [TARGET_CHANNEL] });

        await chatClient.connect();
        await JZZ.requestMIDIAccess();

        const isRewardsMode = getBooleanByString(REWARDS_MODE);
        const isVipRewardsMode = getBooleanByString(VIP_REWARDS_MODE);

        console.log('Bot ready!');
        console.log('Rewards/Channel Points mode: ' + REWARDS_MODE);
        if (isRewardsMode) {
            console.log('   VIP can use commands in Rewards Mode: ' + VIP_REWARDS_MODE);
        }
        console.log('Use !midion in your chat to enable this tool and have fun!\nWhenever you want to disable it, use !midioff');

        // Chat code
        chatClient.onMessage(onMessageHandlerClosure(chatClient, TARGET_MIDI_NAME, parsedTargetMIDIChannel, isRewardsMode, isVipRewardsMode));

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
