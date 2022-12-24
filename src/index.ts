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
import { promises as fs, existsSync } from 'fs';
import { askUserInput, httpsRequestPromise } from './utils/promise';
import http from 'http';
import i18n, { initializei18n } from './i18n/loader';
import { initiateConfigAPI } from './configuration/api/handler';
import { stopAllMidi } from './midi/handler';

/**
 * Initialization code
 */
(async () => {
    try {
        await initializei18n();
        await _acquireLock();
        const env = _parseEnvVariables(await getLoadedEnvVariables(setupConfiguration));
        const botAuthProvider = await getAuthProvider([env.CLIENT_ID, env.CLIENT_SECRET], [env.BOT_ACCESS_TOKEN, env.BOT_REFRESH_TOKEN], 'BOT');
        const broadcasterAuthProvider = await getAuthProvider([env.CLIENT_ID, env.CLIENT_SECRET], [env.BROADCASTER_ACCESS_TOKEN, env.BROADCASTER_REFRESH_TOKEN], 'BROADCASTER');

        console.log(chalk.grey(i18n.t('INIT_WELCOME')));
        await _showUpdateMessages();
        initiateConfigAPI(broadcasterAuthProvider, env.TARGET_CHANNEL);

        const chatClient = new ChatClient({ authProvider: botAuthProvider, channels: [env.TARGET_CHANNEL] });
        await chatClient.connect();

        await JZZ.requestMIDIAccess();

        // Chat code
        chatClient.onMessage(onMessageHandlerClosure(broadcasterAuthProvider, chatClient, env, RequestSource.CHAT));

        // Rewards code
        if (env.REWARDS_MODE) {
            // First, let's disable the rewards
            await toggleRewardsStatus(broadcasterAuthProvider, env.TARGET_CHANNEL, { isEnabled: false });
            await _initializeRewardsMode(broadcasterAuthProvider, chatClient, env);
        }
        _attachOnExitProcessCallbacks(broadcasterAuthProvider, env);
        _showInitMessages(env);
    } catch (error) {
        console.log(chalk.red(String(error)));
        askUserInput(ERROR_MSG.INIT());
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
    const broadcasterUserId = await pubSubClient.registerUserListener(broadcasterAuthProvider);
    await pubSubClient.onRedemption(broadcasterUserId, async ({ id: redemptionId, rewardId, rewardTitle, message: args, userName }: PubSubRedemptionMessage) => {
        // Look up the command
        const [command] = REWARDS_DB.select(REWARD_TITLE_COMMAND, rewardTitle) ?? [];

        // For rewards that are not part of this plugin
        if (!command) return;

        const [parsedCommand] = getCommand(command);

        // Invalid configuration
        if (parsedCommand == null) {
            console.log(ERROR_MSG.INVALID_REWARD());
            return;
        }

        const callCommand = onMessageHandlerClosure(broadcasterAuthProvider, chatClient, env, RequestSource.REWARD);
        await _callCommandByRedeemption(callCommand, broadcasterAuthProvider, { env, args, command }, { redemptionId, userName, rewardId });
    });
}

/**
 * Attaches a callback to exit process signals
 * @param broadcasterAuthProvider Broadcaster auth provider
 * @param env Environment variables
 */
function _attachOnExitProcessCallbacks(broadcasterAuthProvider: RefreshingAuthProvider, env: ParsedEnvVariables): void {
    process.on('SIGHUP', _onExitProcess(broadcasterAuthProvider, env));
    process.on('SIGINT', _onExitProcess(broadcasterAuthProvider, env));
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
    { redemptionId, rewardId, userName }: { redemptionId: string; rewardId: string; userName: string }
): Promise<void> {
    try {
        // In case the method does not end or error in X seconds, it is considered fulfilled
        // For example, !sendloop request do not resolve until another request comes along
        setTimeout(() => updateRedeemIdStatus(authProvider, env.TARGET_CHANNEL, { rewardId, redemptionId, status: 'FULFILLED' }), CONFIG.FULFILL_TIMEOUT_MS);
        // Execute command and mark as fulfilled once finished
        await callCommand(`${GLOBAL.POUND}${env.TARGET_CHANNEL}`, userName, `${command} ${args}`);
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
    const [REWARDS_MODE, VIP_REWARDS_MODE, SEND_UNAUTHORIZED_MESSAGE] = getBooleanByStringList(env.REWARDS_MODE, env.VIP_REWARDS_MODE, env.SEND_UNAUTHORIZED_MESSAGE);
    const TARGET_MIDI_CHANNEL = Number(env.TARGET_MIDI_CHANNEL) - 1;

    return { ...env, TARGET_MIDI_CHANNEL, REWARDS_MODE, VIP_REWARDS_MODE, SEND_UNAUTHORIZED_MESSAGE };
}

/**
 * Shows initialization messages in the terminal
 * @param env Environment variables
 */
function _showInitMessages(env: ParsedEnvVariables): void {
    // Initial message
    console.log(chalk.yellow(i18n.t('INIT_READY')));
    console.log(chalk.green(i18n.t('INIT_USE_MIDION_1')), chalk.greenBright('!midion'), chalk.green(i18n.t('INIT_USE_MIDION_2')));
    console.log(chalk.green(i18n.t('INIT_EXPLORE_MIDIHELP_1')), chalk.greenBright('!midihelp'), chalk.green(i18n.t('INIT_EXPLORE_MIDIHELP_2')));
    console.log(chalk.green(i18n.t('INIT_USE_MIDIOFF')), chalk.greenBright('!midioff'));

    // Flags
    console.log(chalk.gray(i18n.t('INIT_CURRENT_FLAGS')));
    console.log(chalk.magenta(i18n.t('INIT_REWARDS_CHANNELPOINTS_MODE')), chalk.magentaBright(String(env.REWARDS_MODE)));
    console.log(chalk.magenta(i18n.t('INIT_VIP_REWARDS_CHANNELPOINTS_MODE')), chalk.magentaBright(String(env.VIP_REWARDS_MODE)));
    console.log(chalk.magenta(i18n.t('INIT_SEND_UNAUTHORIZED_MESSAGE_FLAG')), chalk.magentaBright(String(env.SEND_UNAUTHORIZED_MESSAGE)));

    // Support message
    console.log(chalk.blueBright(i18n.t('INIT_SEPARATOR')));
    console.log(chalk.cyan(i18n.t('INIT_SPONSOR_1')));
    console.log(chalk.cyan(i18n.t('INIT_SPONSOR_2')));
    console.log(chalk.cyanBright(CONFIG.SPONSOR_PAYPAL_LINK));
    console.log(chalk.cyan(i18n.t('INIT_SPONSOR_THANKS')));
    console.log(chalk.blueBright(i18n.t('INIT_SEPARATOR')));
}

/**
 * Checks if there are updates available on GitHub
 */
async function _checkUpdates(): Promise<[localVersion: string, remoteVersion: string]> {
    try {
        // Read package.json
        const { version: localVersion } = JSON.parse(await fs.readFile(CONFIG.PACKAGE_JSON_PATH, { encoding: 'utf-8' })) as { version: string };
        // Read GitHub's master package.json
        const options: http.RequestOptions = {
            hostname: CONFIG.GITHUB_CONTENT_BASE_URL,
            path: CONFIG.REMOTE_PACKAGE_JSON_PATH,
            port: 443,
            method: 'GET'
        };
        const { version: remoteVersion } = (await httpsRequestPromise(options))?.body as { version: string };
        // Return old and new version
        return [localVersion, remoteVersion];
    } catch (error) {
        // If any read error occurs, return same empty message as local and remote version
        return [GLOBAL.EMPTY_MESSAGE, GLOBAL.EMPTY_MESSAGE];
    }
}

/**
 * Checks for updates on GitHub and shows a message if there's a difference between local and remote version
 */
async function _showUpdateMessages(): Promise<void> {
    const [localVersion, remoteVersion] = await _checkUpdates();
    if (localVersion !== remoteVersion) {
        console.log(chalk.bgBlue.bold(`${i18n.t('INIT_UPDATE_1')}${remoteVersion}${i18n.t('INIT_UPDATE_2')}${localVersion}.`));
        console.log(chalk.bgBlue.bold(`${i18n.t('INIT_UPDATE_3')} ${CONFIG.REPOSITORY_LINK}\n`));
    }
}

/**
 * Disables all rewards (if enabled) and exits. It is used for sudden closes of this application
 * @param broadcasterAuthProvider Broadcaster auth provider
 * @param env Environment variables
 */
function _onExitProcess(broadcasterAuthProvider: RefreshingAuthProvider, env: ParsedEnvVariables): () => Promise<void> {
    return async () => {
        try {
            stopAllMidi(env.TARGET_MIDI_CHANNEL);
        } catch (error) {
            // Do nothing
        }
        if (env.REWARDS_MODE) {
            await toggleRewardsStatus(broadcasterAuthProvider, env.TARGET_CHANNEL, { isEnabled: false });
        }
        await _releaseLock();
        process.exit();
    };
}

/**
 * Deletes the execution lock to indicate that the program has exited
 * @returns 
 */
function _acquireLock(): Promise<void> {
    // Check if another instance is running. 
    // If so, the stored API port will no longer link with the original instance
    if (existsSync(CONFIG.DOT_LOCK)) {
        throw new Error(ERROR_MSG.INSTANCE_ALREADY_RUNNING())
    }

    return fs.writeFile(CONFIG.DOT_LOCK, GLOBAL.EMPTY_MESSAGE);
}


/**
 * Deletes the execution lock to indicate that the program has exited
 * @returns 
 */
function _releaseLock(): Promise<void> {
    return fs.rm(CONFIG.DOT_API_PORT);
}