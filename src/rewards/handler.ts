import { ApiClient, HelixCustomRewardRedemptionTargetStatus, HelixUser } from '@twurple/api';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ERROR_MSG, REWARDS_DB } from '../configuration/constants';
import { REWARD_TITLE_COMMAND } from '../database/jsondb/types';

let broadcasterId: HelixUser['id'];
let apiClient: ApiClient;

/**
 * Creates a set of rewards with the content provided in rewards file
 * @param authProvider Authentication Provider
 * @param username Broadcaster username
 */
export async function createRewards(authProvider: RefreshingAuthProvider, username: string): Promise<void> {
    const apiClient = getApiClient(authProvider);
    const userId = await getBroadcasterId(apiClient, username);

    const rewardEntries = Object.entries(REWARDS_DB.selectAll(REWARD_TITLE_COMMAND) ?? {});
    const createPromiseMap = rewardEntries.map(([title, [, cost]]) =>
        apiClient.channelPoints.createCustomReward(userId, { title, cost, userInputRequired: true, autoFulfill: false })
    );
    try {
        await Promise.allSettled(createPromiseMap);
    } catch (error) {
        // Implement if needed
    }
}

/**
 * Enables/disables the rewards created by this tool
 * @param authProvider Authentication provider
 * @param username Broadcaster username
 * @param { isEnabled: boolean } rewardData Boolean to activate/deactivate rewards
 */
export async function toggleRewardsStatus(authProvider: RefreshingAuthProvider, username: string, { isEnabled }: { isEnabled: boolean }): Promise<void> {
    const apiClient = getApiClient(authProvider);
    const userId = await getBroadcasterId(apiClient, username);
    const allRewards = await apiClient.channelPoints.getCustomRewards(userId, true);

    // Only treat our rewards
    const validRewards = allRewards.filter(({ title }) => REWARDS_DB.select(REWARD_TITLE_COMMAND, title) != null);
    const updatePromiseMap = validRewards.map((reward) => {
        const [, cost] = REWARDS_DB.select(REWARD_TITLE_COMMAND, reward.title) ?? [];
        return apiClient.channelPoints.updateCustomReward(userId, reward.id, { ...reward, isEnabled, cost });
    });
    try {
        await Promise.all(updatePromiseMap);
    } catch (error) {
        // Implement if needed
    }
}

/**
 * Updates the status of a reward redemption
 * @param authProvider Authentication provider
 * @param username Broadcaster username
 * @param { rewardId, redemptionId, status} redemptionData Information about the redemption and new status
 */
export async function updateRedeemIdStatus(
    authProvider: RefreshingAuthProvider,
    username: string,
    { rewardId, redemptionId, status }: { rewardId: string; redemptionId: string; status: HelixCustomRewardRedemptionTargetStatus }
): Promise<void> {
    const apiClient = getApiClient(authProvider);
    const userId = await getBroadcasterId(apiClient, username);
    try {
        await apiClient.channelPoints.updateRedemptionStatusByIds(userId, rewardId, [redemptionId], status);
    } catch (error) {
        // Implement if needed
    }
}

/**
 * Creates or returns the created ApiClient to interact with TwitchAPI
 * @param authProvider Authentication provider
 * @returns ApiClient
 */
export function getApiClient(authProvider: RefreshingAuthProvider): ApiClient {
    if (apiClient != null) {
        return apiClient;
    }

    apiClient = new ApiClient({ authProvider });
    return apiClient;
}

/**
 * Calls TwitchAPI and returns the broadcaster user id
 * @param apiClient Twurple ApiClient
 * @param username Broadcaster username
 * @returns Broadcaster user id
 */
export async function getBroadcasterId(apiClient: ApiClient, username: string): Promise<string> {
    if (broadcasterId != null) {
        return broadcasterId;
    }

    const broadcaster = await apiClient.users.getUserByName(username);
    if (broadcaster == null) {
        throw new Error(ERROR_MSG.BROADCASTER_USER_NOT_FOUND());
    }
    broadcasterId = broadcaster.id;
    return broadcasterId;
}

/**
 * Reloads the rewards from the rewards file
 * @param authProvider Authentication provider
 * @param broadcasterUser Broadcaster username
 */
export async function reloadRewards(authProvider: RefreshingAuthProvider, broadcasterUser: string): Promise<void> {
    // First deactivate all
    await toggleRewardsStatus(authProvider, broadcasterUser, { isEnabled: false });
    // Then update the rewards
    await REWARDS_DB.fetchDB();
    // If the reward is new, create it!
    await createRewards(authProvider, broadcasterUser);
    // Now re-enable
    await toggleRewardsStatus(authProvider, broadcasterUser, { isEnabled: true });
}
