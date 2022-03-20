export interface EnvObject extends Record<string, string> {
    CLIENT_ID: string;
    CLIENT_SECRET: string;
    INITIAL_ACCESS_TOKEN: string;
    INITIAL_REFRESH_TOKEN: string;
    TARGET_CHANNEL: string;
    TARGET_MIDI_NAME: string;
}
