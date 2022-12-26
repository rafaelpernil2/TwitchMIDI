import { JSONDatabase } from '../../database/jsondb/implementation';
import {
    CHORD_PROGRESSIONS_KEY,
    CC_COMMANDS_KEY,
    CC_CONTROLLERS_KEY,
    COMMANDS_KEY,
    MACROS_KEY,
    PERMISSIONS_MAP,
    PermissionsType,
    PermissionsTable,
    REWARD_TITLE_COMMAND
} from '../../database/jsondb/types';
import { ALIASES_DB, CONFIG, ERROR_MSG, PERMISSIONS_DB, REWARDS_DB } from '../constants';
import { httpsRequestPromise } from '../../utils/promise';
import http from 'http';
import { promises as fs, existsSync } from 'fs';
import { Command } from '../../command/types';
import * as CommandHandlers from '../../command/handler';

const DEFAULT_CONFIG_FILE_CACHE: Record<string, unknown> = {};

export async function validateConfigFiles(): Promise<void> {
    if (!existsSync(CONFIG.CONFIG_FOLDER_PATH)) {
        await fs.mkdir(CONFIG.CONFIG_FOLDER_PATH);
    }

    await validateFileGeneric(ALIASES_DB, [COMMANDS_KEY, CHORD_PROGRESSIONS_KEY, CC_COMMANDS_KEY, CC_CONTROLLERS_KEY, MACROS_KEY]);
    await validateFileGeneric(REWARDS_DB, [REWARD_TITLE_COMMAND]);
    await validatePermissionsFile();
}

export async function validateFileGeneric<T, P extends keyof T>(db: JSONDatabase<T>, sections: P[]): Promise<void> {
    let isModified = false;
    // Check each section and fix structure if needed
    for (const section of sections) {
        const sectionData = db.selectAll(section);
        // Skip if it's valid
        if (sectionData != null && typeof sectionData === 'object') continue;

        isModified = true;

        const defaultFile = (await downloadDefaultFileFromRepo(db)) ?? ({} as T);
        db.upsert(section, defaultFile[section]);
    }

    if (isModified) {
        await db.commit();
    }

    return;
}

export async function validatePermissionsFile(): Promise<void> {
    let isModified = false;
    // Check each section and fix structure if needed
    const currentPermissionsMap = PERMISSIONS_DB.selectAll(PERMISSIONS_MAP) ?? ({} as PermissionsType['permissionsMap']);
    const commandList = Object.keys(CommandHandlers).sort() as Command[];

    for (const command of commandList) {
        if (currentPermissionsMap[command] != null) continue;

        isModified = true;

        const defaultFile = (await downloadDefaultFileFromRepo(PERMISSIONS_DB)) ?? ({} as PermissionsType);
        const defaultPermissions = defaultFile[PERMISSIONS_MAP];
        const commandPermissions = { [command]: defaultPermissions[command] } as Record<Command, PermissionsTable>;

        PERMISSIONS_DB.upsert(PERMISSIONS_MAP, commandPermissions);
    }

    if (isModified) {
        await PERMISSIONS_DB.commit();
    }

    return;
}

export async function downloadDefaultFileFromRepo<T>(db: JSONDatabase<T>): Promise<T | undefined> {
    try {
        // Read GitHub's master <config-file>.json
        const fileName = db.fileName;

        // Restore file from cache if exists
        const cachedData = DEFAULT_CONFIG_FILE_CACHE[fileName] as T | undefined;
        if (cachedData != null) {
            return cachedData;
        }

        const options: http.RequestOptions = {
            hostname: CONFIG.GITHUB_CONTENT_BASE_URL,
            path: `${CONFIG.REMOTE_CONFIG_JSON_FOLDER_PATH}/${fileName}`,
            port: 443,
            method: 'GET'
        };

        const data = (await httpsRequestPromise(options))?.body as T;

        // Cache data
        DEFAULT_CONFIG_FILE_CACHE[fileName] = data;

        return data;
    } catch (error) {
        throw new Error(ERROR_MSG.BAD_CONFIG_DOWNLOAD());
    }
}
