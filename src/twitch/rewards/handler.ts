import { RefreshingAuthProvider } from '@twurple/auth';
import { ChatClient } from '@twurple/chat/lib';
import { PubSubClient, PubSubRedemptionMessage } from '@twurple/pubsub';
import { getCommandList } from '../../command/utils';
import { REWARDS_DB, ERROR_MSG, CONFIG, GLOBAL } from '../../configuration/constants';
import { ParsedEnvObject } from '../../configuration/env/types';
import { REWARD_TITLE_COMMAND } from '../../database/jsondb/types';
import { updateRedeemIdStatus } from '../../rewards/handler';
import { onMessageHandlerClosure } from '../command/handler';
import { RequestSource, MessageHandler } from '../command/types';

/**
 * Initializes Rewards mode
 * @param broadcasterAuthProvider Broadcaster auth provider
 * @param chatClient Chat client
 * @param env Environment variables
 */
export async function initializeRewardsMode(broadcasterAuthProvider: RefreshingAuthProvider, chatClient: ChatClient, env: ParsedEnvObject): Promise<void> {
    const pubSubClient = new PubSubClient();
    const broadcasterUserId = await pubSubClient.registerUserListener(broadcasterAuthProvider);
    await pubSubClient.onRedemption(broadcasterUserId, async ({ id: redemptionId, rewardId, rewardTitle, message: args, userName }: PubSubRedemptionMessage) => {
        // Look up the command
        const [command] = REWARDS_DB.select(REWARD_TITLE_COMMAND, rewardTitle) ?? [];

        // For rewards that are not part of this plugin
        if (!command) return;

        const [, commandList] = getCommandList(command);

        // Invalid configuration
        if (commandList.length === 0) {
            console.log(ERROR_MSG.INVALID_REWARD());
            return;
        }

        const callCommand = onMessageHandlerClosure(broadcasterAuthProvider, chatClient, env, RequestSource.REWARD);
        await _callCommandByRedeemption(callCommand, broadcasterAuthProvider, { env, args, command }, { redemptionId, userName, rewardId });
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
    { env, args, command }: { env: ParsedEnvObject; args: string; command: string },
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
