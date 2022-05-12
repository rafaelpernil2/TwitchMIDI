// This NEEDS to be executed first
import 'dotenv/config';

import * as JZZ from 'jzz';

import chalk from 'chalk';
import { getLoadedEnvVariables } from './configuration/env/loader';
import { getAuthProvider } from './twitch/auth/provider';
import { ChatClient } from '@twurple/chat';
import { onMessageHandlerClosure } from './twitch/chat/handler';
import { CONFIG, ERROR_MSG, GLOBAL, REWARDS_DB } from './configuration/constants';

import { PubSubClient, PubSubRedemptionMessage } from '@twurple/pubsub';
import { getBooleanByStringList } from './utils/generic';
import { getCommand } from './command/utils';
import { setupConfiguration } from './configuration/configurator/setup';
import { RefreshingAuthProvider } from '@twurple/auth/lib';
import { EnvObject, ParsedEnvVariables } from './configuration/env/types';
import { REWARD_TITLE_COMMAND } from './database/jsondb/types';
import { toggleRewardsStatus, updateRedeemIdStatus } from './rewards/handler';
import { MessageHandler, RequestSource } from './twitch/chat/types';

/**
 * Initialization code
 */
(async () => {
    try {
        const env = _parseEnvVariables(await getLoadedEnvVariables(setupConfiguration));
        const botAuthProvider = await getAuthProvider([env.CLIENT_ID, env.CLIENT_SECRET], [env.BOT_ACCESS_TOKEN, env.BOT_REFRESH_TOKEN], 'BOT');
        const broadcasterAuthProvider = await getAuthProvider([env.CLIENT_ID, env.CLIENT_SECRET], [env.BROADCASTER_ACCESS_TOKEN, env.BROADCASTER_REFRESH_TOKEN], 'BROADCASTER');

        console.log(chalk.grey("Welcome! I'm loading stuff and making magic. Wait a few seconds..."));

        // First, let's disable the rewards
        await toggleRewardsStatus(broadcasterAuthProvider, env.TARGET_CHANNEL, { isEnabled: false });

        const chatClient = new ChatClient({ authProvider: botAuthProvider, channels: [env.TARGET_CHANNEL] });
        await chatClient.connect();

        await JZZ.requestMIDIAccess();

        // Chat code
        chatClient.onMessage(onMessageHandlerClosure(broadcasterAuthProvider, chatClient, env, RequestSource.CHAT));

        // Rewards code
        if (env.REWARDS_MODE) {
            await _initializeRewardsMode(broadcasterAuthProvider, chatClient, env);
        }
        _showInitMessages(env);
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
async function _initializeRewardsMode(broadcasterAuthProvider: RefreshingAuthProvider, chatClient: ChatClient, env: ParsedEnvVariables): Promise<void> {
    const pubSubClient = new PubSubClient();
    const userId = await pubSubClient.registerUserListener(broadcasterAuthProvider);
    await pubSubClient.onRedemption(userId, async ({ id: redemptionId, rewardId, rewardTitle, message: args }: PubSubRedemptionMessage) => {
        // Look up the command
        const [command] = REWARDS_DB.select(REWARD_TITLE_COMMAND, rewardTitle) ?? [];

        // For rewards that are not part of this plugin
        if (!command) return;

        const [parsedCommand] = getCommand(command);

        // Invalid configuration
        if (parsedCommand == null) {
            console.log(ERROR_MSG.INVALID_REWARD);
            return;
        }

        const callCommand = onMessageHandlerClosure(broadcasterAuthProvider, chatClient, env, RequestSource.REWARD);
        await _callCommandByRedeemption(callCommand, broadcasterAuthProvider, { env, args, command }, { redemptionId, userId, rewardId });
    });
}

/**
 * Calls a command and manages the status of the redemption depending on the output
 * @param callCommand MessageHandler
 * @param authProvider Broadcaster authentication provider
 * @param { env, args, command } commandData Environment variables and command data
 * @param { redemptionId, rewardId, userId } rewardData Reward redemption data
 */
async function _callCommandByRedeemption(
    callCommand: MessageHandler,
    authProvider: RefreshingAuthProvider,
    { env, args, command }: { env: ParsedEnvVariables; args: string; command: string },
    { redemptionId, rewardId, userId }: { redemptionId: string; rewardId: string; userId: string }
): Promise<void> {
    try {
        // In case the method does not end or error in X seconds, it is considered fulfilled
        // For example, !sendloop request do not resolve until another request comes along
        setTimeout(() => updateRedeemIdStatus(authProvider, env.TARGET_CHANNEL, { rewardId, redemptionId, status: 'FULFILLED' }), CONFIG.FULFILL_TIMEOUT_MS);
        // Execute command and mark as fulfilled once finished
        await callCommand(`${GLOBAL.POUND}${env.TARGET_CHANNEL}`, userId, `${command} ${args}`);
        await updateRedeemIdStatus(authProvider, env.TARGET_CHANNEL, { rewardId, redemptionId, status: 'FULFILLED' });
    } catch (error) {
        // Cancel redemption if any error occurs
        await updateRedeemIdStatus(authProvider, env.TARGET_CHANNEL, { rewardId, redemptionId, status: 'CANCELED' });
    }
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

/**
 * Shows initialization messages in the terminal
 * @param env Environment variables
 */
function _showInitMessages(env: ParsedEnvVariables): void {
    // Initial message
    console.log(chalk.yellow('\nTwitchMIDI ready!'));
    console.log(chalk.green('\nUse'), chalk.greenBright('!midion'), chalk.green('in your chat to enable this tool and have fun!'));
    console.log(chalk.green('Whenever you want to disable it, use'), chalk.greenBright('!midioff'));

    // Flags
    console.log(chalk.gray('\nCurrent flags:'));
    console.log(chalk.magenta('\tRewards/Channel Points mode:'), chalk.magentaBright(String(env.REWARDS_MODE)));
    console.log(chalk.magenta('\tVIP can use commands in Rewards Mode:'), chalk.magentaBright(String(env.VIP_REWARDS_MODE)));

    // Support message
    console.log(chalk.blueBright('\n***************\n'));
    console.log(chalk.cyan('This software is free and maintained in my spare time.'));
    console.log(chalk.cyan('If you want to support my work, please contribute on Paypal:\n'));
    console.log(chalk.cyanBright('https://www.paypal.com/donate/?hosted_button_id=9RRAEE5J7NNNN'));
    console.log(chalk.cyan('\nThank you! ♥'));
    console.log(chalk.blueBright('\n***************\n'));
}
