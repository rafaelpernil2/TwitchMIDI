// This NEEDS to be executed first
import 'dotenv/config';

import { getLoadedEnvVariables } from './configuration/env/loader.js';
import { getAuthProvider } from './twitch/auth/provider.js';
import { connectChatClient, initializeChatMode } from './twitch/chat/handler.js';

import { setupConfiguration } from './configuration/configurator/setup.js';
import { initializei18n } from './i18n/loader.js';
import { initiateConfigAPI } from './configuration/api/handler.js';
import { setupConfigFiles } from './configuration/configurator/config-handler.js';
import { initializeRewardsMode } from './twitch/rewards/handler.js';
import { acquireLock, attachExitCallbacksAfterInit, attachExitCallbacksBeforeInit } from './bot/execution/exit-handler.js';
import { requestMIDIAccess } from './midi/handler.js';
import { showInitErrorMessages, showInitReadyMessages, showUpdateMessages, showInitWelcomeMessages } from './bot/execution/logger.js';

/**
 * Initialization code
 */
(async () => {
    try {
        // Acquire lock and attach lock release on exit
        acquireLock();
        attachExitCallbacksBeforeInit();

        // Language detection and prompt
        await initializei18n();

        // Show welcome message and ask user to wait for initialization
        showInitWelcomeMessages();

        // Load .env
        const env = await getLoadedEnvVariables(setupConfiguration);

        // Obtain auth providers in parallel
        const providerPromiseList = [
            getAuthProvider([env.CLIENT_ID, env.CLIENT_SECRET], [env.BROADCASTER_ACCESS_TOKEN, env.BROADCASTER_REFRESH_TOKEN], 'BROADCASTER'),
            getAuthProvider([env.CLIENT_ID, env.CLIENT_SECRET], [env.BOT_ACCESS_TOKEN, env.BOT_REFRESH_TOKEN], 'BOT')
        ] as const;

        const [broadcasterAuthProvider, botAuthProvider] = await Promise.all(providerPromiseList);

        // Initialize Config REST API
        initiateConfigAPI(broadcasterAuthProvider, env);

        // Apply setup steps in parallel
        const setupPromiseList = [
            // Connect to Twitch
            connectChatClient(botAuthProvider, env),
            // Load config files
            setupConfigFiles(),
            // Open MIDI connection
            requestMIDIAccess(),
            // Check for updates
            showUpdateMessages()
        ] as const;
        const [chatClient] = await Promise.all(setupPromiseList);

        // Finish initialization and handle exit signals
        attachExitCallbacksAfterInit(broadcasterAuthProvider, env);

        // Open to external events after initialization
        const twitchConnectionPromiseList = [
            initializeRewardsMode(broadcasterAuthProvider, chatClient, env),
            initializeChatMode(broadcasterAuthProvider, chatClient, env)
        ] as const;
        await Promise.all(twitchConnectionPromiseList);
        // Show init messages
        showInitReadyMessages(env);
    } catch (error) {
        showInitErrorMessages(error);
    }
})();
