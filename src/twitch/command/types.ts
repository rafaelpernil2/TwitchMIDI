import { RefreshingAuthProvider } from '@twurple/auth';
import { ChatClient } from '@twurple/chat';
import { PrivateMessage } from '@twurple/chat';

export enum RequestSource {
    CHAT,
    REWARD
}

export type CommandHandlerType = (...commandParams: CommandParams) => unknown | Promise<unknown>;

export type MessageHandler = (channel: string, user: string, message: string, msg?: PrivateMessage) => Promise<void> | void;

export type UserRoles = {
    /**
     * Whether the user is the broadcaster.
     */
    isBroadcaster: boolean;
    /**
     * Whether the user is subscribed to the channel.
     */
    isSubscriber: boolean;
    /**
     * Whether the user is a Founder of the channel.
     */
    isFounder: boolean;
    /**
     * Whether the user is a moderator of the channel.
     */
    isMod: boolean;
    /**
     * Whether the user is a VIP in the channel.
     */
    isVip: boolean;
};

export type CommandParams = [
    // Message
    message: string,
    // Common params
    common: CommandConfigParams,
    // Twitch params
    twitch: TwitchParams
];

export interface CommandConfigParams {
    targetMIDIName: string;
    targetMIDIChannel: number;
    isRewardsMode: boolean;
    silenceMessages: boolean;
}

export interface TwitchParams {
    chatClient: ChatClient;
    authProvider: RefreshingAuthProvider;
    channel: string;
    user: string;
    broadcasterUser: string;
    userRoles: UserRoles;
}
