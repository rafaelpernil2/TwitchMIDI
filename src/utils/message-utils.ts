import { COMMAND_VALUES, GLOBAL } from '../configuration/constants';
import { CommandType } from '../types/message-types';

export function isValidCommand(message: string): message is CommandType {
    return COMMAND_VALUES[message] != null;
}

export function getCommand(message: string): CommandType | undefined {
    const command = message.slice(1).split(GLOBAL.SPACE_SEPARATOR)[0].toLowerCase();
    return message.startsWith(GLOBAL.EXCLAMATION_TOKEN) && isValidCommand(command) ? command : undefined;
}

export function splitMessageArguments(message: string): string[] {
    return message.split(GLOBAL.SPACE_SEPARATOR).filter((value) => value != '');
}

export function getParenthesisValue(message: string): string {
    return message.substring(message.indexOf(GLOBAL.OPEN_PARENTHESIS_SEPARATOR) + 1, message.indexOf(GLOBAL.CLOSE_PARENTHESIS_SEPARATOR));
}

export function getCommandContent(message: string): string {
    return message.substring(message.indexOf(GLOBAL.SPACE_SEPARATOR) + 1);
}

export function firstMessageValue(message: string): string {
    return message.split(GLOBAL.SPACE_SEPARATOR)[0];
}

export function removeParenthesisPart(message: string): string {
    return message.split(GLOBAL.OPEN_PARENTHESIS_SEPARATOR)[0];
}
