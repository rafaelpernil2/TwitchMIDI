import { TwitchPrivateMessage } from '@twurple/chat/lib/commands/TwitchPrivateMessage';
import { COMMANDS } from '../constants/constants';

export type CommandType = typeof COMMANDS[keyof typeof COMMANDS];

export type MessageHandler = (channel: string, user: string, message: string, msg: TwitchPrivateMessage) => Promise<void> | void;
