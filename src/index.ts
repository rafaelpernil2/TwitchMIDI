// This NEEDS to be executed first
import 'dotenv/config';

import * as JZZ from 'jzz';

import { getLoadedEnvVariables } from './configuration/env/loader';
import { getAuthProvider } from './twitch/auth/provider';
import { ChatClient } from '@twurple/chat';
import { onMessageHandlerClosure } from './twitch/chat/handler';
import { ERROR_MSG, GLOBAL, REWARDS_DB } from './configuration/constants';

import { PubSubClient, PubSubRedemptionMessage } from '@twurple/pubsub';
import { getBooleanByStringList } from './utils/generic';
import { getCommand } from './command/utils';
import { setupConfiguration } from './configuration/configurator/setup';
import { RefreshingAuthProvider } from '@twurple/auth/lib';
import { EnvObject, ParsedEnvVariables } from './configuration/env/types';
import { REWARD_TITLE_COMMAND } from './database/jsondb/types';

/**
 * Initialization code
 */
(async () => {
    try {
        const env = _parseEnvVariables(await getLoadedEnvVariables(setupConfiguration));
        const botAuthProvider = await getAuthProvider([env.CLIENT_ID, env.CLIENT_SECRET], [env.BOT_ACCESS_TOKEN, env.BOT_REFRESH_TOKEN], 'BOT');
        const broadcasterAuthProvider = await getAuthProvider([env.CLIENT_ID, env.CLIENT_SECRET], [env.BROADCASTER_ACCESS_TOKEN, env.BROADCASTER_REFRESH_TOKEN], 'BROADCASTER');

        const chatClient = new ChatClient({ authProvider: botAuthProvider, channels: [env.TARGET_CHANNEL] });
        await chatClient.connect();

        await JZZ.requestMIDIAccess();

        console.log('Bot ready!\nUse !midion in your chat to enable this tool and have fun!\nWhenever you want to disable it, use !midioff');
        // Chat code
        chatClient.onMessage(onMessageHandlerClosure(chatClient, env));

        // Rewards code
        console.log('Rewards/Channel Points mode: ' + String(env.REWARDS_MODE));
        if (env.REWARDS_MODE) {
            await _initializeRewardsMode(broadcasterAuthProvider, chatClient, env);
        }
    } catch (error) {
        console.log(String(error) + '\n' + ERROR_MSG.INIT);
    }
})();

/**
 * Initializes Rewards mode
 * @param broadcasterAuthProvider Broadcaster auth provider
 * @param chatClient Chat client
 * @param env Environment variables
 */
async function _initializeRewardsMode(broadcasterAuthProvider: RefreshingAuthProvider, chatClient: ChatClient, env: ParsedEnvVariables) {
    console.log('   VIP can use commands in Rewards Mode: ' + String(env.VIP_REWARDS_MODE));
    const pubSubClient = new PubSubClient();
    const userId = await pubSubClient.registerUserListener(broadcasterAuthProvider);
    await pubSubClient.onRedemption(userId, async ({ rewardTitle, message: args }: PubSubRedemptionMessage) => {
        // Look up the command
        const command = REWARDS_DB.select(REWARD_TITLE_COMMAND, rewardTitle);

        // For rewards that are not part of this plugin
        if (!command) {
            return;
        }

        const [parsedCommand] = getCommand(command);

        // Invalid configuration
        if (parsedCommand == null) {
            console.log(ERROR_MSG.INVALID_REWARD);
            return;
        }

        const callCommand = onMessageHandlerClosure(chatClient, { ...env, REWARDS_MODE: false, VIP_REWARDS_MODE: false });
        await callCommand(`${GLOBAL.POUND}${env.TARGET_CHANNEL}`, userId, `${command} ${args}`);
    });
}

/**
 * Parse Env variables and conver types where needed
 * @param env EnvObject
 * @returns ParsedEnvVariables
 */
function _parseEnvVariables(env: EnvObject): ParsedEnvVariables {
    const [REWARDS_MODE, VIP_REWARDS_MODE] = getBooleanByStringList(env.REWARDS_MODE, env.VIP_REWARDS_MODE);
    const TARGET_MIDI_CHANNEL = Number(env.TARGET_MIDI_CHANNEL) - 1;

    return { ...env, TARGET_MIDI_CHANNEL, REWARDS_MODE, VIP_REWARDS_MODE };
}
