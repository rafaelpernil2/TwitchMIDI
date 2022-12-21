import http from 'http';
import { ALIASES_DB, REWARDS_DB, PERMISSIONS_DB, GLOBAL, CONFIG } from '../constants';
import i18n from '../../i18n/loader';
import { promises as fs } from 'fs';
import { RefreshingAuthProvider } from '@twurple/auth/lib';
import { reloadRewards } from '../../rewards/handler';
import { favoriteIdMap, markAsFavorite, queueMap, removeFromQueue, unmarkFavorite } from '../../command/queue';
import { Command } from '../../command/types';

// Map of file name with the correspondent DB
const configFileMap = {
    aliases: ALIASES_DB,
    rewards: REWARDS_DB,
    permissions: PERMISSIONS_DB
} as const;

/**
 * Creates an HTTP server that implements Configuration API
 */

/**
 * Creates an HTTP server that implements Configuration API
 * @param authProvider Authentication provider
 * @param broadcasterUser Broadcaster username
 */
export function initiateConfigAPI(authProvider: RefreshingAuthProvider, broadcasterUser: string): void {
    // Create server
    const server = http.createServer(_onRequest(authProvider, broadcasterUser));
    // Listen from server
    server.listen(() => {
        const address = server.address();
        const port = address != null && typeof address !== 'string' ? address.port : -1;
        if (port === -1) {
            return;
        }
        // Write reserved port into file to be able to interact with the API
        fs.writeFile(CONFIG.DOT_API_PORT, String(port));
    });
}

/**
 * Exposes a REST API via /refreshConfig with a "file" as query param to refresh
 * config files on demand
 * @param authProvider Authentication provider
 * @param broadcasterUser Broadcaster username
 * @returns A request listener for a HTTP server
 */
function _onRequest(authProvider: RefreshingAuthProvider, broadcasterUser: string): (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void> {
    return async (req, res) => {
        const url = new URL(req.url ?? '', `http://${req.headers.host ?? ''}`);

        switch (url.pathname) {
            // RefreshConfig API
            case '/refreshConfig': {
                // Only allow get requests
                if (req.method !== 'POST') return _buildResponse(res, 405);

                // Obtain name of file to refresh
                const queryFile = (url.searchParams.get('file') ?? GLOBAL.EMPTY_MESSAGE) as keyof typeof configFileMap;

                // Check file exists
                if (configFileMap[queryFile] == null) return _buildResponse(res, 400, i18n.t('API_ERROR_FILE'));

                // If it is a reward, reload them
                if (queryFile === 'rewards') {
                    await reloadRewards(authProvider, broadcasterUser);
                } else {
                    // Refresh the file
                    await configFileMap[queryFile].fetchDB();
                }

                // Happy path, all OK! :)
                return _buildResponse(res, 200, `${i18n.t('API_OK_1')} "${queryFile}" ${i18n.t('API_OK_2')}`);
            }
            case '/queue': {
                // Obtain name of command to check
                const commandName = url.searchParams.get('command') as Command | null;
                const turn = url.searchParams.get('turn');

                switch (req.method) {
                    case 'GET': {
                        // Obtain queue details
                        const queueData = commandName != null ? queueMap[commandName] : queueMap;
                        // Happy path, all OK! :)
                        res.setHeader('Content-Type', 'application/json');
                        return _buildResponse(res, 200, JSON.stringify(queueData));
                    }
                    case 'DELETE': {
                        if (commandName == null || turn == null) {
                            return _buildResponse(res, 400, i18n.t('API_BAD_DATA'));
                        }

                        // Obtain queue details
                        removeFromQueue(commandName, Number(turn));
                        // Happy path, all OK! :)
                        return _buildResponse(res, 200, i18n.t('API_OK'));
                    }
                    default:
                        break;
                }
                break;
            }

            case '/favorite': {
                // Obtain name of command to check
                const commandName = url.searchParams.get('command') as Command | null;
                const turn = url.searchParams.get('turn');

                switch (req.method) {
                    case 'GET': {
                        // Obtain favoriteIdMap details
                        const favoriteData = commandName != null ? favoriteIdMap[commandName] : favoriteIdMap;
                        // Happy path, all OK! :)
                        res.setHeader('Content-Type', 'text/plain');
                        return _buildResponse(res, 200, JSON.stringify(favoriteData));
                    }
                    case 'PUT': {
                        if (commandName == null || turn == null) {
                            return _buildResponse(res, 400, i18n.t('API_BAD_DATA'));
                        }

                        // Populate change
                        markAsFavorite(commandName, Number(turn));

                        // Happy path, all OK! :)
                        return _buildResponse(res, 200, i18n.t('API_OK'));
                    }
                    case 'DELETE': {
                        if (commandName == null) {
                            return _buildResponse(res, 400, i18n.t('API_BAD_DATA'));
                        }

                        // Populate change
                        unmarkFavorite(commandName);

                        // Happy path, all OK! :)
                        return _buildResponse(res, 200, i18n.t('API_OK'));
                    }
                    default:
                        break;
                }
                break;
            }
            default:
                return _buildResponse(res, 400, i18n.t('API_ERROR_NOT_A_METHOD'));
        }
    };
}

/**
 * Builds a response for an http server response
 * @param res Server response
 * @param code HTTP code
 * @param message Message to return
 */
function _buildResponse(res: http.ServerResponse, code: number, message?: string): void {
    // Writes HTTP code
    res.writeHead(code);
    // Returns message
    res.end(message);
}
