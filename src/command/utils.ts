import { ALIAS_MAP, COMMAND_VALUES, GLOBAL } from '../configuration/constants';
import { Command } from './types';

/**
 *  MESSAGE METHODS
 */

/**
 * Checks if a command is in the list of defined commands and aliases
 * @param message
 * @returns
 */
export function isValidCommand(message: string): message is Command {
    return COMMAND_VALUES[message] != null;
}

/**
 * Obtains a command from chat message
 * @param message
 * @returns
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
    return ALIAS_MAP[command] ?? command;
}

/**
 * Splits message arguments separated by space
 * @param commandArguments
 * @returns
 */
export function splitCommandArguments(commandArguments: string): string[] {
    return commandArguments.split(GLOBAL.SPACE_SEPARATOR).filter((value) => value !== GLOBAL.EMPTY_MESSAGE);
}
