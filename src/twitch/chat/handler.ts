import { RefreshingAuthProvider } from '@twurple/auth/lib';
import { ChatClient } from '@twurple/chat/lib';
import { ParsedEnvObject } from '../../configuration/env/types';
import { onMessageHandlerClosure } from '../command/handler';
import { RequestSource } from '../command/types';

/**
 * Initializes Rewards mode
 * @param broadcasterAuthProvider Broadcaster auth provider
 * @param chatClient Chat client
 * @param env Environment variables
 */
export function initializeChatMode(broadcasterAuthProvider: RefreshingAuthProvider, chatClient: ChatClient, env: ParsedEnvObject): void {
    // Chat code
    chatClient.onMessage(onMessageHandlerClosure(broadcasterAuthProvider, chatClient, env, RequestSource.CHAT));
}
