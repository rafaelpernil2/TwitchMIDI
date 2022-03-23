#!/usr/bin/env node
// This NEEDS to be executed first
import 'dotenv/config';
// Workaround for bad "webmidi" package dependency injection
import 'jzz';

import { getLoadedEnvVariables } from './configuration/env-loader';
import { getAuthProvider } from './providers/auth-provider';
import { ChatClient } from '@twurple/chat';
import { onMessageHandlerClosure } from './handlers/message-handler';
import { WebMidi } from 'webmidi';
import { ERROR_MSG } from './constants/constants';

(async () => {
    const { CLIENT_ID, CLIENT_SECRET, INITIAL_ACCESS_TOKEN, INITIAL_REFRESH_TOKEN, TARGET_CHANNEL, TARGET_MIDI_NAME, TARGET_MIDI_CHANNEL } = getLoadedEnvVariables();
    try {
        const authProvider = await getAuthProvider(CLIENT_ID, CLIENT_SECRET, INITIAL_ACCESS_TOKEN, INITIAL_REFRESH_TOKEN);

        const chatClient = new ChatClient({ authProvider, channels: [TARGET_CHANNEL] });
        await chatClient.connect();

        chatClient.onMessage(onMessageHandlerClosure(chatClient, TARGET_MIDI_NAME, Number(TARGET_MIDI_CHANNEL)));

        WebMidi.enable().catch(() => console.log('First WebMIDI connection'));
    } catch (error) {
        console.log(ERROR_MSG.TWITCH_API, error);
    }
})();
