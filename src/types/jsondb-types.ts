import { CommandType } from './message-types';

export interface AliasesType {
    chordProgressions: Record<string, string>;
    ccCommands: Record<string, string[]>;
    ccControllers: Record<string, number>;
    commands: Record<string, CommandType>;
}

export const CHORD_PROGRESSIONS = 'chordProgressions';
export const CC_COMMANDS = 'ccCommands';
export const CC_CONTROLLERS = 'ccControllers';
export const COMMANDS_KEY = 'commands';

export interface RewardsType {
    rewardTitleCommandMap: Record<string, string>;
}

export const REWARD_TITLE_COMMAND = 'rewardTitleCommandMap';
