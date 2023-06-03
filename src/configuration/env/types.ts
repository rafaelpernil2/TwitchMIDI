export const envVariables = [
    'CLIENT_ID',
    'CLIENT_SECRET',
    'BOT_ACCESS_TOKEN',
    'BOT_REFRESH_TOKEN',
    'BROADCASTER_ACCESS_TOKEN',
    'BROADCASTER_REFRESH_TOKEN',
    'TARGET_CHANNEL',
    'TARGET_MIDI_NAME',
    'TARGET_MIDI_CHANNEL',
    'REWARDS_MODE',
    'VIP_REWARDS_MODE',
    'SEND_UNAUTHORIZED_MESSAGE',
    'SILENCE_MACRO_MESSAGES'
] as const;

export type EnvObject = Record<(typeof envVariables)[number], string>;

export interface ParsedEnvObject extends Omit<EnvObject, 'REWARDS_MODE' | 'VIP_REWARDS_MODE' | 'TARGET_MIDI_CHANNEL' | 'SEND_UNAUTHORIZED_MESSAGE' | 'SILENCE_MACRO_MESSAGES'> {
    REWARDS_MODE: boolean;
    VIP_REWARDS_MODE: boolean;
    TARGET_MIDI_CHANNEL: number;
    SEND_UNAUTHORIZED_MESSAGE: boolean;
    SILENCE_MACRO_MESSAGES: boolean;
}
