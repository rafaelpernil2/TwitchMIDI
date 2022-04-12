import { TwitchPrivateMessage } from '@twurple/chat/lib/commands/TwitchPrivateMessage';
import { COMMANDS } from '../../configuration/constants';

export type CommandType = typeof COMMANDS[keyof typeof COMMANDS];

export type CommandHandler = (channel: string, user: string, message: string, userRoles: UserRoles) => Promise<void> | void;

export type MessageHandler = (channel: string, user: string, message: string, msg?: TwitchPrivateMessage) => Promise<void> | void;

export type UserRoles = {
    isBroadcaster: boolean;
    isMod: boolean;
    isSubscriber: boolean;
};
