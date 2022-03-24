export interface AliasesType {
    chordProgressions: Record<string, string>;
    ccCommands: Record<string, string[]>;
}

export const CHORD_PROGRESSIONS = 'chordProgressions';
export const CC_COMMANDS = 'ccCommands';

export interface RewardsType {
    rewardTitleCommandMap: Record<string, string>;
}

export const REWARD_TITLE_COMMAND = 'rewardTitleCommandMap';
