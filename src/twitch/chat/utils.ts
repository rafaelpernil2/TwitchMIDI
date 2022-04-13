import { Command, COMMAND_VALUES, GLOBAL } from '../../configuration/constants';

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
export function getCommand(message: string): Command | undefined {
    const command = message.slice(1).split(GLOBAL.SPACE_SEPARATOR)[0].toLowerCase();
    return message.startsWith(GLOBAL.EXCLAMATION_TOKEN) && isValidCommand(command) ? command : undefined;
}

/**
 * Splits message arguments separated by space
 * @param message
 * @returns
 */
export function splitMessageArguments(message: string): string[] {
    return message.split(GLOBAL.SPACE_SEPARATOR).filter((value) => value != '');
}

/**
 * Retrieves value between parenthesis
 * @param message
 * @returns
 */
export function getParenthesisValue(message: string): string {
    return message.substring(message.indexOf(GLOBAL.OPEN_PARENTHESIS_SEPARATOR) + 1, message.indexOf(GLOBAL.CLOSE_PARENTHESIS_SEPARATOR));
}

/**
 * Returns command arguments
 * @param message
 * @returns
 */
export function getCommandContent(message: string): string {
    return message.substring(message.indexOf(GLOBAL.SPACE_SEPARATOR) + 1);
}

/**
 * Returns the first argument
 * @param message
 * @returns
 */
export function firstMessageValue(message: string): string {
    return message.split(GLOBAL.SPACE_SEPARATOR)[0];
}

/**
 * Removes the content between parenthesis (if it is at the end of the token)
 * @param message
 * @returns
 */
export function removeParenthesisPart(message: string): string {
    return message.split(GLOBAL.OPEN_PARENTHESIS_SEPARATOR)[0];
}
