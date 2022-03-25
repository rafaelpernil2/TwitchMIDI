import readline from 'readline';
import http from 'http';
import EventEmitter from 'events';
import { httpsRequestPromise } from '../utils/promise-utils';
import { promises as fs } from 'fs';
import { EnvObject } from '../types/env-object-type';
import { getBooleanByString } from '../utils/data-utils';
import { AccessToken } from '@twurple/auth/lib';
import { CONFIG } from '../configuration/constants';
import chalk from 'chalk';

const localHTTPServerEmitter = new EventEmitter(); // I use Node.js events for notifying when the beat start is ready
const NEW_CODE = 'newCode';

export async function setupConfiguration(): Promise<EnvObject> {
    console.log(
        chalk.yellow(`
        _______       _ _       _     __  __ _____ _____ _____ 
        |__   __|     (_) |     | |   |  \\/  |_   _|  __ \\_   _|
           | |_      ___| |_ ___| |__ | \\  / | | | | |  | || |  
           | \\ \\ /\\ / / | __/ __| '_ \\| |\\/| | | | | |  | || |  
           | |\\ V  V /| | || (__| | | | |  | |_| |_| |__| || |_ 
           |_| \\_/\\_/ |_|\\__\\___|_| |_|_|  |_|_____|_____/_____|
                                               by rafaelpernil2
                                                                
    If you are seeing this, it means this is your first time
    running this software (or some setting was wrong). Welcome! :)

    We are going to generate a .env file with all the credentials
    and configurations, but don't worry about specifics, this will be easy.
    `)
    );
    // This executes when there is not a valid .env file
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    console.log(
        chalk.greenBright(`
    STEP 1 - Create a Twitch Bot and get the ClientID and Client Secret
    `)
    );
    console.log(
        chalk.magenta(`
    Let's start by opening Twitch Development console
        (Ctrl+click/Double click select + Right click copy): https://dev.twitch.tv/console/apps

    Now click on "Register your Application" and fill out the following information:

        -Name: Choose any name you like, this will only be shown when asking for permissions later
        -OAuth Redirect URLs: http://localhost:8000 (VERY IMPORTANT STEP)
        -Category: Chat Bot

    Once it is created, a table with all applications will appear. Click on "Manage"

    Here come the important steps:

        -Copy your Client ID and save it somewhere for later steps

        -Click on "New Secret", accept the alert and save that value somewhere
        safe.This value will only be shown once

    You will have a Client ID and a Client Secret ready to go!

    `)
    );
    // CLIENT_ID

    const CLIENT_ID = await makeQuestion(rl, '*********** Paste your Client ID and press enter\n');
    // CLIENT_SECRET=
    const CLIENT_SECRET = await makeQuestion(rl, '*********** Paste your Client Secret and press enter\n');

    console.log(
        chalk.greenBright(`
    STEP 2 - Authorize your streamer user to work in your stream
    `)
    );
    console.log(
        chalk.magenta(`
    We create an authorization request from previous information.
    Once the code is received, another petition will be automatically submitted
    to retrieve the Access Token and Refresh Token. It's all automatic, don't worry :)

    Login to your streamer channel, go to the following page and click on "Authorize".

    If it all went well, you will see a page that says "Authentication successful!"
    `)
    );

    const server = _createAuthServer(CONFIG.LOCAL_SERVER_HOST, CONFIG.LOCAL_SERVER_PORT);

    // CODE
    const authUrl = await _createAuthURL(CLIENT_ID);
    console.log(
        chalk.magenta(`
        Go to (Ctrl+click/Double click select + Right click copy):\n\t\t${authUrl}
    `)
    );

    // Wait until user clicks and authorizes
    const BROADCASTER_CODE = await getAuthCode();

    const { access_token, refresh_token } = await _createTokenURL(CLIENT_ID, CLIENT_SECRET, BROADCASTER_CODE);
    const BROADCASTER_ACCESS_TOKEN = access_token;
    const BROADCASTER_REFRESH_TOKEN = refresh_token;

    // BOT_ACCESS_TOKEN=
    // BOT_REFRESH_TOKEN=
    const isBotDifferent = getBooleanByString((await makeQuestion(rl, 'Do you want to use a different user for your bot? (Y/n)\n')) || 'Y');
    let BOT_ACCESS_TOKEN = BROADCASTER_ACCESS_TOKEN;
    let BOT_REFRESH_TOKEN = BROADCASTER_REFRESH_TOKEN;
    if (isBotDifferent) {
        console.log(
            chalk.greenBright(`
        Authorize your Bot account to work in your stream
        `)
        );
        console.log(
            chalk.magenta(`
        Let's repeat but, before, login to your bot account.
        Then go to (Ctrl+click/Double click select + Right click copy):\n\t\t${authUrl}
        `)
        );
        // Wait until user clicks and authorizes
        const BOT_CODE = await getAuthCode();
        const { access_token, refresh_token } = await _createTokenURL(CLIENT_ID, CLIENT_SECRET, BOT_CODE);

        BOT_ACCESS_TOKEN = access_token;
        BOT_REFRESH_TOKEN = refresh_token;
    }

    console.log(
        chalk.greenBright(`
    STEP 3 - Customizations
    `)
    );
    console.log(
        chalk.magenta(`
    At this point we already have access to Twitch API but we need some extra information:

    -Target Channel - The channel where this bot will be used, where you stream

    -Rewards/Channel Points mode - This mode restricts the bot commands for streamer and
     mods and only allows actions to be sent via custom Rewards


    `)
    );
    // TARGET_CHANNEL=
    const TARGET_CHANNEL = await makeQuestion(rl, '*********** Enter the Twitch channel where you stream\n');
    // REWARDS_MODE=
    const rewardsModeFlag = (await makeQuestion(rl, '*********** Do you want to use Rewards/Channel Points mode instead of chat? (Y/n)\n')) || 'Y';
    const REWARDS_MODE = String(getBooleanByString(rewardsModeFlag));

    console.log(
        chalk.greenBright(`
    STEP 4 - MIDI 
    `)
    );
    console.log(
        chalk.magenta(`
    For this application to work, you need a virtual MIDI device. If you use Windows, either
    one of these two should work flawlessly:

    loopMIDI (Default/ What I use) - https://www.tobias-erichsen.de/software/loopmidi.html

    LoopBe1 - https://nerds.de/en/loopbe1.html


    `)
    );
    // TARGET_MIDI_NAME=
    const TARGET_MIDI_NAME = (await makeQuestion(rl, '*********** Enter the name of the Virtual MIDI device to use (Default: loopMIDI Port)\n')) || 'loopMIDI Port';
    // TARGET_MIDI_CHANNEL=
    const TARGET_MIDI_CHANNEL = (await makeQuestion(rl, '*********** Enter the MIDI channel to use with your Virtual MIDI device (Default: 1)\n')) || '1';

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
    await fs.appendFile(CONFIG.DOT_ENV_PATH, 'REWARDS_MODE=' + String(REWARDS_MODE) + '\n');

    rl.close();
    server.close();
    console.log(
        chalk.greenBright(`
    STEP ???? - Profit
    `)
    );
    console.log(
        chalk.magenta(`
    Everything is ready, have fun!
    Feel free to modify the .env file at any time
    `)
    );
    console.log(
        chalk.yellowBright(`
    ***** Software developed by Rafael Pernil (@rafaelpernil2) ***** 
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
        REWARDS_MODE
    };
}

function makeQuestion(rl: readline.Interface, question: string): Promise<string> {
    return new Promise<string>((resolve) => {
        rl.question(question, (answer) => resolve(answer));
    });
}

async function getAuthCode(): Promise<string> {
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
            res.end('Bad authentication!');
            return;
        }
        localHTTPServerEmitter.emit(NEW_CODE, code);
        res.writeHead(200);
        res.end('Authentication successful!');
    };
    const server = http.createServer(requestListener);
    server.listen(port, host);
    return server;
}

async function _createAuthURL(client_id: string): Promise<string> {
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

async function _createTokenURL(client_id: string, client_secret: string, code: string): Promise<{ access_token: string; refresh_token: string }> {
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
