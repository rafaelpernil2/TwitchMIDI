import { Command } from '../../command/types';
import { UserRoles } from '../../twitch/chat/types';

export interface AliasesType {
    chordProgressions: Record<string, string>;
    ccCommands: Record<string, string[]>;
    ccControllers: Record<string, number>;
    commands: Record<string, Command>;
    macros: Record<string, Array<[command: string, delay: number]>>;
}

export const CHORD_PROGRESSIONS_KEY = 'chordProgressions';
export const CC_COMMANDS_KEY = 'ccCommands';
export const CC_CONTROLLERS_KEY = 'ccControllers';
export const COMMANDS_KEY = 'commands';
export const MACROS_KEY = 'macros';

export interface RewardsType {
    rewardTitleCommandMap: Record<string, [command: string, cost: number]>;
}

export const REWARD_TITLE_COMMAND = 'rewardTitleCommandMap';

export interface PermissionsType {
    permissionsMap: Record<Command, PermissionsTable>;
}

export const PERMISSIONS_MAP = 'permissionsMap';

export interface PermissionsTable {
    requirements: Array<keyof UserRoles>;
    whitelist: string[];
    blacklist: string[];
}
