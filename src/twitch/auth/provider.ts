import { AccessToken, RefreshingAuthProvider } from '@twurple/auth';
import { promises as fs } from 'fs';
import { CONFIG } from '../../configuration/constants';
/**
 * Generates an authentication provider for Twitch
 * @param client [clientId, clientSecret]
 * @param tokens [accessToken, refreshToken]
 * @param kind 'BOT' | 'BROADCASTER'
 * @returns
 */
export async function getAuthProvider(
    [clientId, clientSecret]: [clientId: string, clientSecret: string],
    [accessToken, refreshToken]: [accessToken: string, refreshToken: string],
    kind: 'BOT' | 'BROADCASTER'
): Promise<RefreshingAuthProvider> {
    const template = JSON.parse(await fs.readFile(CONFIG.TOKENS_TEMPLATE_PATH, { encoding: 'utf-8' })) as AccessToken;
    const tokenData: AccessToken = { ...template, accessToken, refreshToken };
    const tokensPath = kind === 'BOT' ? CONFIG.BOT_TOKENS_PATH : CONFIG.BROADCASTER_TOKENS_PATH;
    return new RefreshingAuthProvider(
        { clientId, clientSecret, onRefresh: async (newTokenData) => await fs.writeFile(tokensPath, JSON.stringify(newTokenData, null, 4), { encoding: 'utf-8' }) },
        tokenData
    );
}
