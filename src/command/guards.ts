import { ERROR_MSG, PERMISSIONS_DB } from '../configuration/constants';
import { PERMISSIONS_MAP } from '../database/jsondb/types';
import { SharedVariable } from '../shared-variable/implementation';
import { TwitchParams, UserRoles } from '../twitch/chat/types';
import { Command } from './types';

export const isTwitchMIDIOpen = new SharedVariable(false);

/**
 * Checks that the user has enough permissions to execute the command matching permissions.json
 * Throws an error if it does not have enough permissions
 * @param command
 * @param twitch
 */
export function checkCommandAccess(command: Command, twitch: TwitchParams): void {
    const permissionTable = PERMISSIONS_DB.select(PERMISSIONS_MAP, command);
    if (permissionTable == null) {
        throw new Error(ERROR_MSG.BAD_PERMISSIONS);
    }
    const { userRoles, user } = twitch;
    const { requirements, blacklist, whitelist } = permissionTable;
    _checkTwitchMIDIOpen(userRoles);
    _checkBlacklist(blacklist, user);
    _checkWhitelist(whitelist, user);
    _checkRequirements(requirements, userRoles);
}

/**
 * Checks if the requests are open. If you are the streamer, you have total freedom
 * @param userRoles Roles of user
 * @returns
 */
function _checkTwitchMIDIOpen({ isBroadcaster }: UserRoles): void {
    if (!isTwitchMIDIOpen.get() && !isBroadcaster) {
        throw new Error(ERROR_MSG.BOT_PAUSED_DISCONNECTED);
    }
}

/**
 * Checks the roles of the user to decide whether allow the request or deny it
 * @param requirements Role requirements
 * @param userRoles Roles of user
 * @returns
 */
function _checkRequirements(requirements: Array<keyof UserRoles>, userRoles: UserRoles): void {
    // If no data, that means everyone is allowed
    if (requirements == null || requirements.length === 0) {
        return;
    }
    const isValid = requirements.some((requirement) => userRoles[requirement]);
    if (!isValid) {
        throw new Error(ERROR_MSG.BAD_PERMISSIONS);
    }
}

/**
 * Checks if the user is not in the blacklist
 * Otherwise it throws an error
 * @param blacklist Blacklist
 * @param user Twitch username
 * @returns
 */
function _checkBlacklist(blacklist: string[], user: string): void {
    // If no data, that means everyone is allowed
    if (blacklist == null || blacklist.length === 0) {
        return;
    }
    const isInBlacklist = blacklist.find((bannedUser) => user === bannedUser);
    if (isInBlacklist) {
        throw new Error(ERROR_MSG.BAD_PERMISSIONS);
    }
}

/**
 * Checks if there is a whitelist and if the user is there
 * Otherwise it throws an error
 * @param whitelist Whitelist
 * @param user Twitch username
 * @returns
 */
function _checkWhitelist(whitelist: string[], user: string): void {
    // If no data, that means everyone is allowed
    if (whitelist == null || whitelist.length === 0) {
        return;
    }
    const isInWhitelist = whitelist.find((allowedUser) => user === allowedUser);
    if (!isInWhitelist) {
        throw new Error(ERROR_MSG.BAD_PERMISSIONS);
    }
}
