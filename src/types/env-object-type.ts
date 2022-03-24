export interface EnvObject extends Record<string, string> {
    CLIENT_ID: string;
    CLIENT_SECRET: string;
    BOT_ACCESS_TOKEN: string;
    BOT_REFRESH_TOKEN: string;
    BROADCASTER_ACCESS_TOKEN: string;
    BROADCASTER_REFRESH_TOKEN: string;
    TARGET_CHANNEL: string;
    TARGET_MIDI_NAME: string;
    TARGET_MIDI_CHANNEL: string;
    REWARDS_MODE: string;
}
