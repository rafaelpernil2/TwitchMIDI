import { Command } from '../../configuration/constants';
import { UserRoles } from '../../twitch/chat/types';

export interface AliasesType {
    chordProgressions: Record<string, string>;
    ccCommands: Record<string, string[]>;
    ccControllers: Record<string, number>;
    commands: Record<string, Command>;
}

export const CHORD_PROGRESSIONS = 'chordProgressions';
export const CC_COMMANDS = 'ccCommands';
export const CC_CONTROLLERS = 'ccControllers';
export const COMMANDS_KEY = 'commands';

export interface RewardsType {
    rewardTitleCommandMap: Record<string, string>;
}

export const REWARD_TITLE_COMMAND = 'rewardTitleCommandMap';

export interface PermissionsType {
    permissionsMap: Record<Command, PermissionsTable>;
}

export interface PermissionsTable {
    requirements: Array<keyof UserRoles>;
    whitelist: string[];
    blacklist: string[];
}

export const PERMISSIONS_MAP = 'permissionsMap';
