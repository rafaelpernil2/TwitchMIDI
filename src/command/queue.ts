import { ERROR_MSG, EVENT, EVENT_EMITTER, GLOBAL } from '../configuration/constants';
import { isEmptyObject } from '../utils/generic';
import { Command } from './types';

const queueMap = Object.fromEntries(Object.values(Command).map((key) => [key, {}])) as Record<Command, Record<number, string | null>>;
const queueCommitMap = Object.fromEntries(Object.values(Command).map((key) => [key, {}])) as Record<Command, Record<number, string | null>>;
const uniqueIdMap = Object.fromEntries(Object.values(Command).map((key) => [key, -1])) as Record<Command, number>;
export const currentTurnMap = Object.fromEntries(Object.values(Command).map((key) => [key, 0])) as Record<Command, number>;

let requestPlayingNow: { type: Command; request: string } | null;

/**
 * Adds request to queue
 * @param request
 * @param type
 * @returns
 */
export function queue(request: string, type: Command): number {
    // Throw error on duplicate requests
    if (request === _getLastInQueue(type)) {
        throw new Error(ERROR_MSG.DUPLICATE_REQUEST);
    }

    const turn = _getNewQueueTurn(type);
    queueMap[type][turn] = request;

    return turn;
}

/**
 * Moves to the next in queue
 * @param type
 */
export function forwardQueue(type: Command): void {
    const turn = _nextTurn(currentTurnMap[type]);

    // Keep playing same loop if it's looping alone
    if (_isLoopingAlone(type, turn)) {
        return;
    }

    delete queueMap[type][currentTurnMap[type]];
    currentTurnMap[type] = turn;

    // If there's no chord progression or loop next, let's clear requestPlayingNow
    if (isQueueEmpty(Command.sendchord) && isQueueEmpty(Command.sendloop)) {
        requestPlayingNow = null;
    }
}

/**
 * Resolves once the bar is starting and your turn is reached
 * It uses Node.js Event Emitters for notifying
 * @param turn
 * @param type
 * @returns An empty promise
 */
export async function waitForMyTurn(turn: number, type: Command): Promise<void> {
    return new Promise((resolve) => {
        const onCommandTurn = (currentChordMode: Command) => {
            if (_isMyTurn(turn, type) && _isCollisionFree(currentChordMode, type)) {
                _setRequestPlayingNow(type, queueMap[type][turn] ?? GLOBAL.EMPTY_MESSAGE);
                EVENT_EMITTER.removeListener(EVENT.BAR_LOOP_CHANGE_EVENT, onCommandTurn);
                resolve();
            }
        };
        EVENT_EMITTER.on(EVENT.BAR_LOOP_CHANGE_EVENT, onCommandTurn);
    });
}

/**
 * Returns the current request being played
 * @returns Request information
 */
export function getCurrentRequestPlaying(): { type: Command; request: string } | null {
    return requestPlayingNow;
}

/**
 * Checks if queue is empty
 * @param type
 * @returns
 */
export function isQueueEmpty(type: Command): boolean {
    return isEmptyObject(queueMap[type]);
}

/**
 * Removes petitions from a queue by type
 * @param type
 */
export function clearQueue(type: Command): void {
    queueCommitMap[type] = JSON.parse(JSON.stringify(queueMap[type])) as Record<number, string | null>;
    queueMap[type] = {};
}

/**
 * Clears all queues
 */
export function clearAllQueues(): void {
    for (const type of Object.values(Command)) {
        clearQueue(type);
    }
    requestPlayingNow = null;
}

/**
 * Removes petitions from a list of queues
 * @param typeList
 */
export function clearQueueList(...typeList: Command[]): void {
    for (const type of typeList) {
        clearQueue(type);
    }
    // If it includes both sendchord and sendloop, reset requestPlayingNow
    if (typeList.includes(Command.sendchord) && typeList.includes(Command.sendloop)) {
        requestPlayingNow = null;
    }
}

/**
 * Restores the previous values cleared in a queue by type
 * @param type
 */
export function rollbackClearQueue(type: Command): void {
    const backup = JSON.parse(JSON.stringify(queueCommitMap[type])) as Record<number, string | null>;
    queueMap[type] = { ...backup, ...queueMap[type] };
}

/**
 * Gets the last turn in queue
 * @param type
 * @returns
 */
function _getLastIndex(type: Command): number {
    return uniqueIdMap[type];
}

/**
 * Returns the last item in the queue
 * @param type
 * @returns
 */
function _getLastInQueue(type: Command): string | null {
    return queueMap[type]?.[_getLastIndex(type)];
}

/**
 * Calculates the new turn for enqueuing
 * @param type
 * @returns
 */
function _getNewQueueTurn(type: Command): number {
    uniqueIdMap[type] = _nextTurn(uniqueIdMap[type]);
    return uniqueIdMap[type];
}

/**
 * Gets the next turn in queue
 * @param turn
 * @returns
 */
function _nextTurn(turn: number): number {
    return turn + 1;
}

/**
 * Checks if there's only one looping request and it should keep going
 * @param type
 * @param nextTurn
 * @returns
 */
function _isLoopingAlone(type: Command, nextTurn: number): boolean {
    return type === Command.sendloop && queueMap[type][currentTurnMap[type]] != null && queueMap[type]?.[nextTurn] == null;
}

/**
 * Checks if it's your turn
 * @param turn Queue position
 * @param type Type of queue
 * @returns boolean
 */
function _isMyTurn(turn: number, type: Command): boolean {
    return turn === currentTurnMap[type];
}

/**
 * Collision prevention algorithm that separates sendchord and sendloop queues
 * @param currentChordMode The chord mode playing right now
 * @param type Queue type
 * @returns If next petition can be started without collision
 */
function _isCollisionFree(currentChordMode: Command, type: Command): boolean {
    // If a chord progression wants to start, check if the current chord mode is sendchord.
    // Since sendchord has priority, this will stay this way until the sendchord queue is empty
    // If a loop wants to start, check if the chord queue still has requests and wait until it's empty ("wait" is done by calling this method each bar)
    // In any other case, with normal queues, move on!
    return (currentChordMode === Command.sendchord && type === Command.sendchord) || type !== Command.sendloop || isQueueEmpty(Command.sendchord);
}

/**
 * Sets the request playing now and emits an event
 * @param type Command type
 * @param request Request content
 */
function _setRequestPlayingNow(type: Command, request: string): void {
    // If it keeps playing the same, do nothing
    if (requestPlayingNow?.request === request && requestPlayingNow?.type === type) {
        return;
    }
    requestPlayingNow = { request, type };
    EVENT_EMITTER.emit(EVENT.PLAYING_NOW, type, request);
}
