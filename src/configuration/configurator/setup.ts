import readline from 'readline';
import http from 'http';
import EventEmitter from 'events';
import { httpsRequestPromise, setTimeoutPromise } from '../../utils/promise';
import { promises as fs } from 'fs';
import { EnvObject } from '../env/types';
import { getBooleanByString } from '../../utils/generic';
import { AccessToken } from '@twurple/auth/lib';
import { CONFIG } from '../constants';
import chalk from 'chalk';
import i18n from '../../i18n/loader';

const localHTTPServerEmitter = new EventEmitter(); // I use Node.js events for notifying when the beat start is ready
const NEW_CODE = 'newCode';

export async function setupConfiguration(): Promise<EnvObject> {
    console.log(chalk.yellow(i18n.t('SETUP_1')));
    // Arbitrary delay for usability
    await setTimeoutPromise(5_000_000_000);
    // This executes when there is not a valid .env file
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    console.log(chalk.greenBright(i18n.t('SETUP_STEP_1')));
    console.log(chalk.magenta(i18n.t('SETUP_STEP_1_TEXT')));

    const CLIENT_ID = await _makeQuestion(rl, i18n.t('SETUP_STEP_1_CLIENT_ID_QUESTION'));
    const CLIENT_SECRET = await _makeQuestion(rl, i18n.t('SETUP_STEP_1_CLIENT_SECRET_QUESTION'));

    console.log(chalk.greenBright(i18n.t('SETUP_STEP_2')));
    console.log(chalk.magenta(i18n.t('SETUP_STEP_2_TEXT')));
    // This server awaits the response from the URL
    const server = _createAuthServer(CONFIG.LOCAL_SERVER_HOST, CONFIG.LOCAL_SERVER_PORT);
    const authUrl = await _createAuthURL(CLIENT_ID);
    console.log(chalk.magenta(i18n.t('SETUP_STEP_2_LINK') + authUrl));

    // Wait until user clicks and authorizes
    const BROADCASTER_CODE = await _getAuthCode();

    const { access_token, refresh_token } = await _requestTokenByCode(CLIENT_ID, CLIENT_SECRET, BROADCASTER_CODE);
    const BROADCASTER_ACCESS_TOKEN = access_token;
    const BROADCASTER_REFRESH_TOKEN = refresh_token;

    const isBotDifferent = getBooleanByString((await _makeQuestion(rl, i18n.t('SETUP_STEP_2_BOT_QUESTION'))) || 'Y');
    let BOT_ACCESS_TOKEN = BROADCASTER_ACCESS_TOKEN;
    let BOT_REFRESH_TOKEN = BROADCASTER_REFRESH_TOKEN;
    if (isBotDifferent) {
        console.log(chalk.greenBright(i18n.t('SETUP_STEP_2_BOT_TEXT_1')));
        console.log(chalk.magenta(i18n.t('SETUP_STEP_2_BOT_TEXT_2') + authUrl));
        // Wait until user clicks and authorizes
        const BOT_CODE = await _getAuthCode();
        const { access_token, refresh_token } = await _requestTokenByCode(CLIENT_ID, CLIENT_SECRET, BOT_CODE);

        BOT_ACCESS_TOKEN = access_token;
        BOT_REFRESH_TOKEN = refresh_token;
    }

    console.log(chalk.greenBright(i18n.t('SETUP_STEP_3')));
    console.log(chalk.magenta(i18n.t('SETUP_STEP_3_TEXT')));
    const TARGET_CHANNEL = await _makeQuestion(rl, i18n.t('SETUP_STEP_3_TARGET_CHANNEL_QUESTION'));
    const rewardsModeFlag = (await _makeQuestion(rl, i18n.t('SETUP_STEP_3_REWARDS_MODE_QUESTION'))) || 'Y';
    const REWARDS_MODE = String(getBooleanByString(rewardsModeFlag));

    const vipRewardsModeFlag = (await _makeQuestion(rl, i18n.t('SETUP_STEP_3_VIP_REWARDS_MODE_QUESTION'))) || 'Y';
    const VIP_REWARDS_MODE = String(getBooleanByString(vipRewardsModeFlag));

    console.log(chalk.greenBright(i18n.t('SETUP_STEP_4')));
    console.log(chalk.magenta(i18n.t('SETUP_STEP_4_TEXT')));
    const TARGET_MIDI_NAME = (await _makeQuestion(rl, i18n.t('SETUP_STEP_4_TARGET_MIDI_NAME_QUESTION'))) || 'loopMIDI Port';
    const TARGET_MIDI_CHANNEL = (await _makeQuestion(rl, i18n.t('SETUP_STEP_4_TARGET_MIDI_CHANNEL_QUESTION'))) || '1';

    // Delete the original file first
    try {
        await fs.unlink(CONFIG.DOT_ENV_PATH);
    } catch (error) {
        // Do nothing if file didn't exist
    }
    await fs.appendFile(CONFIG.DOT_ENV_PATH, 'CLIENT_ID=' + CLIENT_ID + '\n');
    await fs.appendFile(CONFIG.DOT_ENV_PATH, 'CLIENT_SECRET=' + CLIENT_SECRET + '\n');
    await fs.appendFile(CONFIG.DOT_ENV_PATH, 'BOT_ACCESS_TOKEN=' + BOT_ACCESS_TOKEN + '\n');
    await fs.appendFile(CONFIG.DOT_ENV_PATH, 'BOT_REFRESH_TOKEN=' + BOT_REFRESH_TOKEN + '\n');
    await fs.appendFile(CONFIG.DOT_ENV_PATH, 'BROADCASTER_ACCESS_TOKEN=' + BROADCASTER_ACCESS_TOKEN + '\n');
    await fs.appendFile(CONFIG.DOT_ENV_PATH, 'BROADCASTER_REFRESH_TOKEN=' + BROADCASTER_REFRESH_TOKEN + '\n');
    await fs.appendFile(CONFIG.DOT_ENV_PATH, 'TARGET_CHANNEL=' + TARGET_CHANNEL + '\n');
    await fs.appendFile(CONFIG.DOT_ENV_PATH, 'TARGET_MIDI_NAME=' + TARGET_MIDI_NAME + '\n');
    await fs.appendFile(CONFIG.DOT_ENV_PATH, 'TARGET_MIDI_CHANNEL=' + TARGET_MIDI_CHANNEL + '\n');
    await fs.appendFile(CONFIG.DOT_ENV_PATH, 'REWARDS_MODE=' + REWARDS_MODE + '\n');
    await fs.appendFile(CONFIG.DOT_ENV_PATH, 'VIP_REWARDS_MODE=' + VIP_REWARDS_MODE + '\n');

    rl.close();
    server.close();
    console.log(chalk.greenBright(i18n.t('SETUP_STEP_END')));
    console.log(chalk.magenta(i18n.t('SETUP_STEP_END_READY')));
    console.log(
        chalk.yellowBright(`
    ***** ${i18n.t('SETUP_STEP_END_CREDITS')} Rafael Pernil (@rafaelpernil2) ***** 
    `)
    );

    return {
        CLIENT_ID,
        CLIENT_SECRET,
        BOT_ACCESS_TOKEN,
        BOT_REFRESH_TOKEN,
        BROADCASTER_ACCESS_TOKEN,
        BROADCASTER_REFRESH_TOKEN,
        TARGET_CHANNEL,
        TARGET_MIDI_NAME,
        TARGET_MIDI_CHANNEL,
        REWARDS_MODE,
        VIP_REWARDS_MODE
    };
}

function _makeQuestion(rl: readline.Interface, question: string): Promise<string> {
    return new Promise<string>((resolve) => {
        rl.question(question, (answer) => resolve(answer));
    });
}

async function _getAuthCode(): Promise<string> {
    return new Promise((resolve) => {
        const listener = (code: string) => {
            resolve(code);
            localHTTPServerEmitter.removeListener(NEW_CODE, listener);
        };
        localHTTPServerEmitter.on(NEW_CODE, listener);
    });
}

function _createAuthServer(host: string, port: number): http.Server {
    const requestListener: http.RequestListener = function (req, res) {
        const code = new URLSearchParams(req.url).get('/?code');
        if (code == null) {
            res.writeHead(300);
            res.end(i18n.t('AUTH_SERVER_OK'));
            return;
        }
        localHTTPServerEmitter.emit(NEW_CODE, code);
        res.writeHead(200);
        res.end(i18n.t('AUTH_SERVER_OK'));
    };
    const server = http.createServer(requestListener);
    server.listen(port, host);
    return server;
}

async function _createAuthURL(client_id: string): Promise<string> {
    // Obtains the scopes from the template file
    const accessTokenTemplate = JSON.parse(await fs.readFile(CONFIG.TOKENS_TEMPLATE_PATH, { encoding: 'utf-8' })) as AccessToken;
    const scope = accessTokenTemplate.scope.reduce((acc, curr) => (acc += '+' + curr));
    const authParams = new URLSearchParams({
        response_type: 'code',
        client_id,
        redirect_uri: CONFIG.REDIRECT_URI,
        scope,
        state: 'frontend'
    });
    return CONFIG.TWITCH_BASE_AUTH_URL + 'authorize?' + decodeURIComponent(authParams.toString());
}

async function _requestTokenByCode(client_id: string, client_secret: string, code: string): Promise<{ access_token: string; refresh_token: string }> {
    const tokenParams = new URLSearchParams({
        client_id,
        client_secret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: CONFIG.REDIRECT_URI
    });
    const tokenURL = new URL(CONFIG.TWITCH_BASE_AUTH_URL + 'token?' + tokenParams.toString());
    const options: http.RequestOptions = {
        hostname: tokenURL.hostname,
        path: tokenURL.pathname + tokenURL.search,
        port: 443,
        method: 'POST'
    };
    const response = await httpsRequestPromise(options).catch((error) => console.log(error));
    return response?.body as { access_token: string; refresh_token: string };
}
