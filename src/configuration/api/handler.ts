import http from 'http';
import { ALIASES_DB, REWARDS_DB, PERMISSIONS_DB, GLOBAL, CONFIG } from '../constants';
import i18n from '../../i18n/loader';
import { promises as fs } from 'fs';

// Map of file name with the correspondent DB
const configFileMap = {
    aliases: ALIASES_DB,
    rewards: REWARDS_DB,
    permissions: PERMISSIONS_DB
} as const;

/**
 * Creates an HTTP server that implements Configuration API
 */
export function initiateConfigAPI(): void {
    // Create server
    const server = http.createServer(_onRequest);
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
 * @returns An HTTP server
 */
async function _onRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '', `http://${req.headers.host ?? ''}`);

    // Only allow get requests
    if (req.method !== 'GET') return _buildResponse(res, 405);

    switch (url.pathname) {
        // RefreshConfig API
        case '/refreshConfig': {
            // Obtain name of file to refresh
            const queryFile = (url.searchParams.get('file') ?? GLOBAL.EMPTY_MESSAGE) as keyof typeof configFileMap;

            // Check file exists
            if (configFileMap[queryFile] == null) return _buildResponse(res, 400, i18n.t('API_ERROR_FILE'));

            // Refresh the file
            await configFileMap[queryFile].fetchDB();

            // Happy path, all OK! :)
            return _buildResponse(res, 200, `${i18n.t('API_OK_1')} "${queryFile}" ${i18n.t('API_OK_2')}`);
        }
        default:
            return _buildResponse(res, 400, i18n.t('API_ERROR_NOT_A_METHOD'));
    }
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
