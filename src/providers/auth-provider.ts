import { AccessToken, RefreshingAuthProvider } from '@twurple/auth';
import { promises as fs } from 'fs';
import { CONFIG } from '../constants/constants';
export async function getAuthProvider(clientId: string, clientSecret: string, accessToken: string, refreshToken: string): Promise<RefreshingAuthProvider> {
    const tokenData: AccessToken = {
        ...(JSON.parse(await fs.readFile(CONFIG.TOKENS_TEMPLATE_PATH, { encoding: 'utf-8' })) as AccessToken),
        accessToken,
        refreshToken
    };
    return new RefreshingAuthProvider(
        {
            clientId,
            clientSecret,
            onRefresh: async (newTokenData) => await fs.writeFile(CONFIG.TOKENS_PATH, JSON.stringify(newTokenData, null, 4), { encoding: 'utf-8' })
        },
        tokenData
    );
}
