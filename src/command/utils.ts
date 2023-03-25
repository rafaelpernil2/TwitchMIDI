import { ChatClient } from '@twurple/chat/lib';
import { ALIASES_DB, GLOBAL } from '../configuration/constants';
import { COMMANDS_KEY, MACROS_KEY } from '../database/jsondb/types';
import { buildChunkedMessage } from '../utils/generic';
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
export function getCommand(message: string): [command: Command | null, args: string] {
    const [command, ...args] = message.slice(1).split(GLOBAL.SPACE_SEPARATOR);
    const parsedCommand = command.toLowerCase();
    const isCommand = message.startsWith(GLOBAL.EXCLAMATION_MARK) && isValidCommand(parsedCommand);

    return [isCommand ? deAliasCommand(parsedCommand) : null, args.join(GLOBAL.SPACE_SEPARATOR)];
}

/**
 * Obtains a command and arguments from chat message
 * @param message
 * @returns [command?: Command, args?: string]
 */
export function getMacro(message: string): Array<[command: Command | null, args: string, delay: number]> {
    const [command] = message.slice(1).split(GLOBAL.SPACE_SEPARATOR);
    const parsedCommand = command.toLowerCase();

    // If there's no exclamation mark, it's an invalid macro. Ignore the arguments
    if (!message.startsWith(GLOBAL.EXCLAMATION_MARK)) {
        return [];
    }

    // Obtain list of messages from the macro
    const messageList = ALIASES_DB.select(MACROS_KEY, parsedCommand) ?? [];

    // Parse all messages with delay in nanoseconds
    return messageList.map(([message, delay]) => [...getCommand(message), delay * 1_000_000]);
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
 * Get command list by macro or single command
 * @param message Single command or macro
 * @returns Command list
 */
export function getCommandList(message: string): [isMacroMessage: boolean, commandList: Array<[command: Command | null, args: string, delay: number]>] {
    const [command, args] = getCommand(message);

    // Macro case - It is not a valid single command by itself
    if (command == null) {
        return [true, getMacro(message)];
    }

    // Common case - Single command, delay of 0ns
    return [false, [[command, args, 0]]];
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
 * @param { silenceMessages: boolean } options Parameters for customizing the behaviour
 */
export function sayTwitchChatMessage(chatClient: ChatClient, channel: string, [leading = '', content = '', trailing = ''] = [], { silenceMessages } = { silenceMessages: false }) {
    // Do nothing if messages are muted
    if (silenceMessages) return;

    const messageList = buildChunkedMessage([leading, content, trailing]);
    for (const twitchMessage of messageList) {
        chatClient.say(channel, twitchMessage);
    }
}
