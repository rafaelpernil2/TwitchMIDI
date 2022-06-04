import { ChatClient } from '@twurple/chat/lib';
import { ALIASES_DB, GLOBAL } from '../configuration/constants';
import { COMMANDS_KEY } from '../database/jsondb/types';
import { buildTwitchMessage } from '../utils/generic';
import { Command } from './types';

/**
 * Checks if a command is in the list of defined commands and aliases
 * @param message
 * @returns
 */
export function isValidCommand(message: string): message is Command {
    const possibleCommand = deAliasCommand(message);
    return Command[possibleCommand] != null;
}

/**
 * Obtains a command and arguments from chat message
 * @param message
 * @returns [command?: Command, args?: string]
 */
export function getCommand(message: string): [command?: Command, args?: string] {
    const [command, ...args] = message.slice(1).split(GLOBAL.SPACE_SEPARATOR);
    const parsedCommand = command.toLowerCase();
    const isCommand = message.startsWith(GLOBAL.EXCLAMATION_MARK) && isValidCommand(parsedCommand);

    return [isCommand ? deAliasCommand(parsedCommand) : undefined, args.join(GLOBAL.SPACE_SEPARATOR)];
}

/**
 * Get command by alias or return current command if not found
 * @param command Alias of command or command
 * @returns Command
 */
export function deAliasCommand(command: string): Command {
    return ALIASES_DB.select(COMMANDS_KEY, command) ?? (command as Command);
}

/**
 * Splits message arguments separated by space
 * @param commandArguments
 * @returns List of arguments
 */
export function splitCommandArguments(commandArguments: string): string[] {
    return commandArguments.split(GLOBAL.SPACE_SEPARATOR).filter((value) => value !== GLOBAL.EMPTY_MESSAGE);
}

/**
 * Splits and says in as many messages as needed the full message, even if it exceeds the 500 character limit
 * @param chatClient Twitch Chat Client
 * @param channel Twitch Chat channel
 * @param messageData [leading, content, trailing] Data for the message
 */
export function sayLongTwitchChatMessage(chatClient: ChatClient, channel: string, [leading = '', content = '', trailing = ''] = []) {
    const messageList = buildTwitchMessage([leading, content, trailing]);
    for (const twitchMessage of messageList) {
        chatClient.say(channel, twitchMessage);
    }
}
