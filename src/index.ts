// This NEEDS to be executed first
import 'dotenv/config';

import JZZ from 'jzz';

import chalk from 'chalk';
import { getLoadedEnvVariables } from './configuration/env/loader.js';
import { getAuthProvider } from './twitch/auth/provider.js';
import { ChatClient } from '@twurple/chat';
import { initializeChatMode } from './twitch/chat/handler.js';
import { CONFIG, ERROR_MSG } from './configuration/constants.js';

import { setupConfiguration } from './configuration/configurator/setup.js';
import { ParsedEnvObject } from './configuration/env/types.js';
import { toggleRewardsStatus } from './rewards/handler.js';
import { askUserInput } from './utils/promise.js';
import i18n, { initializei18n } from './i18n/loader.js';
import { initiateConfigAPI } from './configuration/api/handler.js';
import { validateConfigFiles } from './configuration/configurator/config-handler.js';
import { initializeRewardsMode } from './twitch/rewards/handler.js';
import { acquireLock, attachExitCallbacksAfterInit, attachExitCallbacksBeforeInit } from './bot/execution/exit-handler.js';
import { checkUpdates } from './bot/execution/checks-handler.js';

/**
 * Initialization code
 */
(async () => {
    try {
        // Language detection and prompt
        await initializei18n();

        // Acquire lock and attach lock release on exit
        acquireLock();
        attachExitCallbacksBeforeInit();

        // Load config data
        const env = await getLoadedEnvVariables(setupConfiguration);
        const botAuthProvider = await getAuthProvider([env.CLIENT_ID, env.CLIENT_SECRET], [env.BOT_ACCESS_TOKEN, env.BOT_REFRESH_TOKEN], 'BOT');
        const broadcasterAuthProvider = await getAuthProvider([env.CLIENT_ID, env.CLIENT_SECRET], [env.BROADCASTER_ACCESS_TOKEN, env.BROADCASTER_REFRESH_TOKEN], 'BROADCASTER');

        console.log(chalk.grey(i18n.t('INIT_WELCOME')));

        await validateConfigFiles();
        // Check for updates
        await _showUpdateMessages();

        // Initialize Config REST API
        initiateConfigAPI(broadcasterAuthProvider, env.TARGET_CHANNEL);

        // Connect to Twitch
        const chatClient = new ChatClient({ authProvider: botAuthProvider, channels: [env.TARGET_CHANNEL] });
        await chatClient.connect();

        // Open MIDI connection
        await JZZ.requestMIDIAccess();

        // Chat code
        initializeChatMode(broadcasterAuthProvider, chatClient, env);

        // Rewards code
        if (env.REWARDS_MODE) {
            // First, let's disable the rewards
            await toggleRewardsStatus(broadcasterAuthProvider, env.TARGET_CHANNEL, { isEnabled: false });
            await initializeRewardsMode(broadcasterAuthProvider, chatClient, env);
        }

        // Finish initialization and handle exit signals
        attachExitCallbacksAfterInit(broadcasterAuthProvider, env);
        _showInitMessages(env);
    } catch (error) {
        console.log(chalk.red(String(error)));
        askUserInput(ERROR_MSG.INIT());
    }
})();

/**
 * Shows initialization messages in the terminal
 * @param env Environment variables
 */
function _showInitMessages(env: ParsedEnvObject): void {
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
 * Checks for updates on GitHub and shows a message if there's a difference between local and remote version
 */
async function _showUpdateMessages(): Promise<void> {
    const [localVersion, remoteVersion] = await checkUpdates();
    if (localVersion !== remoteVersion) {
        console.log(chalk.bgBlue.bold(`${i18n.t('INIT_UPDATE_1')}${remoteVersion}${i18n.t('INIT_UPDATE_2')}${localVersion}.`));
        console.log(chalk.bgBlue.bold(`${i18n.t('INIT_UPDATE_3')} ${CONFIG.REPOSITORY_LINK}\n`));
    }
}
