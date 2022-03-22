import { AccessToken, RefreshingAuthProvider } from '@twurple/auth';
import { promises as fs } from 'fs';
export async function getAuthProvider(clientId: string, clientSecret: string, accessToken: string, refreshToken: string): Promise<RefreshingAuthProvider> {
    const tokenData: AccessToken = {
        ...(JSON.parse(await fs.readFile('./config/tokens.template.json', { encoding: 'utf-8' })) as AccessToken),
        accessToken,
        refreshToken
    };
    return new RefreshingAuthProvider(
        {
            clientId,
            clientSecret,
            onRefresh: async (newTokenData) => await fs.writeFile('./config/tokens.json', JSON.stringify(newTokenData, null, 4), { encoding: 'utf-8' })
        },
        tokenData
    );
}
