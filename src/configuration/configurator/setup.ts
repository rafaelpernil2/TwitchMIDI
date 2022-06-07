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
import * as VALIDATORS from '../env/validators';

const localHTTPServerEmitter = new EventEmitter(); // I use Node.js events for notifying when the beat start is ready
const NEW_CODE = 'newCode';

/**
 * Setup process taking place when some environment variable is not loaded
 * @param currentVariables
 * @returns
 */
export async function setupConfiguration(currentVariables: EnvObject): Promise<EnvObject> {
    console.log(chalk.yellow(i18n.t('SETUP_1')));
    // Arbitrary delay for usability
    await setTimeoutPromise(5_000_000_000);
    // This executes when there is not a valid .env file
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Clone current values first and validate them. If invalid, the value is set to null
    const targetEnv = validateEnv(JSON.parse(JSON.stringify(currentVariables)) as EnvObject);
    let {
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
        VIP_REWARDS_MODE,
        SEND_UNAUTHORIZED_MESSAGE
    } = targetEnv;

    // STEP 1
    if (isStep1Invalid(targetEnv)) {
        console.log(chalk.greenBright(i18n.t('SETUP_STEP_1')));
        console.log(chalk.magenta(i18n.t('SETUP_STEP_1_TEXT')));

        CLIENT_ID = await _makeQuestion(rl, i18n.t('SETUP_STEP_1_CLIENT_ID_QUESTION'), CLIENT_ID);
        CLIENT_SECRET = await _makeQuestion(rl, i18n.t('SETUP_STEP_1_CLIENT_SECRET_QUESTION'), CLIENT_SECRET);
    }

    // STEP 2
    if (isStep2Invalid(targetEnv)) {
        console.log(chalk.greenBright(i18n.t('SETUP_STEP_2')));
        console.log(chalk.magenta(i18n.t('SETUP_STEP_2_TEXT')));
        // This server awaits the response from the URL
        const server = _createAuthServer(CONFIG.LOCAL_SERVER_HOST, CONFIG.LOCAL_SERVER_PORT);
        const authUrl = await _createAuthURL(CLIENT_ID);
        console.log(chalk.magenta(i18n.t('SETUP_STEP_2_LINK') + authUrl));

        // Wait until user clicks and authorizes
        const BROADCASTER_CODE = await _getAuthCode();

        const { access_token, refresh_token } = await _requestTokenByCode(CLIENT_ID, CLIENT_SECRET, BROADCASTER_CODE);
        BROADCASTER_ACCESS_TOKEN = access_token;
        BROADCASTER_REFRESH_TOKEN = refresh_token;

        const isBotDifferent = getBooleanByString((await _makeQuestion(rl, i18n.t('SETUP_STEP_2_BOT_QUESTION'))) || 'Y');
        BOT_ACCESS_TOKEN = BROADCASTER_ACCESS_TOKEN;
        BOT_REFRESH_TOKEN = BROADCASTER_REFRESH_TOKEN;
        if (isBotDifferent) {
            console.log(chalk.greenBright(i18n.t('SETUP_STEP_2_BOT_TEXT_1')));
            console.log(chalk.magenta(i18n.t('SETUP_STEP_2_BOT_TEXT_2') + authUrl));
            // Wait until user clicks and authorizes
            const BOT_CODE = await _getAuthCode();
            const { access_token, refresh_token } = await _requestTokenByCode(CLIENT_ID, CLIENT_SECRET, BOT_CODE);

            BOT_ACCESS_TOKEN = access_token;
            BOT_REFRESH_TOKEN = refresh_token;
        }
        server.close();
        // Delete current token JSONs
        await deleteTokenJSONs();
    }

    // STEP 3
    if (isStep3Invalid(targetEnv)) {
        console.log(chalk.greenBright(i18n.t('SETUP_STEP_3')));
        console.log(chalk.magenta(i18n.t('SETUP_STEP_3_TEXT')));
        TARGET_CHANNEL = await _makeQuestion(rl, i18n.t('SETUP_STEP_3_TARGET_CHANNEL_QUESTION'), TARGET_CHANNEL);

        const sendUnauthorizedMessage = (await _makeQuestion(rl, i18n.t('SETUP_STEP_3_UNAUTHORIZED_MESSAGE_QUESTION', SEND_UNAUTHORIZED_MESSAGE))) || 'Y';
        SEND_UNAUTHORIZED_MESSAGE = String(getBooleanByString(sendUnauthorizedMessage));
        const rewardsModeFlag = (await _makeQuestion(rl, i18n.t('SETUP_STEP_3_REWARDS_MODE_QUESTION'), REWARDS_MODE)) || 'Y';
        REWARDS_MODE = String(getBooleanByString(rewardsModeFlag));

        const vipRewardsModeFlag = (await _makeQuestion(rl, i18n.t('SETUP_STEP_3_VIP_REWARDS_MODE_QUESTION'), VIP_REWARDS_MODE)) || 'Y';
        VIP_REWARDS_MODE = String(getBooleanByString(vipRewardsModeFlag));
    }

    // STEP 4
    if (isStep4Invalid(targetEnv)) {
        console.log(chalk.greenBright(i18n.t('SETUP_STEP_4')));
        console.log(chalk.magenta(i18n.t('SETUP_STEP_4_TEXT')));
        TARGET_MIDI_NAME = (await _makeQuestion(rl, i18n.t('SETUP_STEP_4_TARGET_MIDI_NAME_QUESTION'), TARGET_MIDI_NAME)) || 'loopMIDI Port';
        TARGET_MIDI_CHANNEL = (await _makeQuestion(rl, i18n.t('SETUP_STEP_4_TARGET_MIDI_CHANNEL_QUESTION'), TARGET_MIDI_CHANNEL)) || '1';
    }

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
    await fs.appendFile(CONFIG.DOT_ENV_PATH, 'SEND_UNAUTHORIZED_MESSAGE=' + SEND_UNAUTHORIZED_MESSAGE + '\n');

    rl.close();
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
        VIP_REWARDS_MODE,
        SEND_UNAUTHORIZED_MESSAGE
    };
}

// Step validations

/**
 * Validates current environment variables and replaces bad values with null to be reconfigured later
 * @param env Environment variables
 * @returns New Environment Variables object with replaces
 */
function validateEnv(env: EnvObject): EnvObject {
    const validatedEntries = Object.entries(env).map(([key, value]) => {
        try {
            VALIDATORS?.[key as keyof typeof VALIDATORS]?.(value);
            return [key, value];
        } catch (error) {
            // If it throws an error, it means it is invalid
            return [key, null];
        }
    });
    return Object.fromEntries(validatedEntries) as EnvObject;
}

/**
 * Checks if the step 1 from the setup is invalid or not configurated
 * @param env Environment variables object
 * @returns If it is invalid or not configurated
 */
function isStep1Invalid({ CLIENT_ID, CLIENT_SECRET }: EnvObject): boolean {
    return CLIENT_ID == null || CLIENT_SECRET == null;
}

/**
 * Checks if the step 2 from the setup is invalid or not configurated
 * @param env Environment variables object
 * @returns If it is invalid or not configurated
 */
function isStep2Invalid({ BROADCASTER_ACCESS_TOKEN, BROADCASTER_REFRESH_TOKEN, BOT_ACCESS_TOKEN, BOT_REFRESH_TOKEN }: EnvObject): boolean {
    return BROADCASTER_ACCESS_TOKEN == null || BROADCASTER_REFRESH_TOKEN == null || BOT_ACCESS_TOKEN == null || BOT_REFRESH_TOKEN == null;
}

/**
 * Checks if the step 3 from the setup is invalid or not configurated
 * @param env Environment variables object
 * @returns If it is invalid or not configurated
 */
function isStep3Invalid({ REWARDS_MODE, VIP_REWARDS_MODE, TARGET_CHANNEL, SEND_UNAUTHORIZED_MESSAGE }: EnvObject): boolean {
    return REWARDS_MODE == null || VIP_REWARDS_MODE == null || TARGET_CHANNEL == null || SEND_UNAUTHORIZED_MESSAGE == null;
}

/**
 * Checks if the step 4 from the setup is invalid or not configurated
 * @param env Environment variables object
 * @returns If it is invalid or not configurated
 */
function isStep4Invalid({ TARGET_MIDI_NAME, TARGET_MIDI_CHANNEL }: EnvObject): boolean {
    return TARGET_MIDI_NAME == null || TARGET_MIDI_CHANNEL == null;
}

/**
 * Removes current token files to avoid collisions with new authentication data from setup
 */
async function deleteTokenJSONs() {
    try {
        await fs.unlink(CONFIG.BOT_TOKENS_PATH);
        await fs.unlink(CONFIG.BROADCASTER_TOKENS_PATH);
    } catch (error) {
        // Do nothing if file didn't exist
    }
}

/**
 * Makes a question for the user
 * @param rl ReadLine interface
 * @param question Question to make
 * @param preConfiguredValue Value already stored to check first
 * @returns Response from question
 */
function _makeQuestion(rl: readline.Interface, question: string, preConfiguredValue?: unknown): Promise<string> {
    if (preConfiguredValue != null) {
        return Promise.resolve(String(preConfiguredValue));
    }
    return new Promise<string>((resolve) => {
        rl.question(question, (answer) => resolve(answer));
    });
}

/**
 * Promisifies an event listener waiting for an authorization code
 * @returns Authorization code
 */
async function _getAuthCode(): Promise<string> {
    return new Promise((resolve) => {
        const listener = (code: string) => {
            resolve(code);
            localHTTPServerEmitter.removeListener(NEW_CODE, listener);
        };
        localHTTPServerEmitter.on(NEW_CODE, listener);
    });
}

/**
 * Creates a local HTTP server to listen to Twitch authorization redirect
 * @param host Host
 * @param port Port
 * @returns An HTTP server
 */
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

/**
 * Builds a Twitch Authorization URL for using the bot
 * @param client_id Twitch bot Client ID
 * @returns Authorization URL
 */
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

/**
 * Requests a set of tokens from Twitch with a given request code
 * @param client_id Twitch bot Client ID
 * @param client_secret Twitch bot Client Secret
 * @param code Request code
 * @returns Access token and refresh token
 */
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
