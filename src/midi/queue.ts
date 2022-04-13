import { Command, ERROR_MSG, EVENT, EVENT_EMITTER } from '../configuration/constants';
import { isEmptyObject } from '../utils/generic';

const queueMap = Object.fromEntries(Object.values(Command).map((key) => [key, {}])) as Record<Command, Record<number, string | null>>;
const queueCommitMap = Object.fromEntries(Object.values(Command).map((key) => [key, {}])) as Record<Command, Record<number, string | null>>;
const uniqueIdMap = Object.fromEntries(Object.values(Command).map((key) => [key, -1])) as Record<Command, number>;
export const currentTurnMap = Object.fromEntries(Object.values(Command).map((key) => [key, 0])) as Record<Command, number>;

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
            if (isMyTurn(turn, type) && isCollisionFree(currentChordMode, type)) {
                EVENT_EMITTER.removeListener(EVENT.BAR_LOOP_CHANGE_EVENT, onCommandTurn);
                resolve();
            }
        };
        EVENT_EMITTER.on(EVENT.BAR_LOOP_CHANGE_EVENT, onCommandTurn);
    });
}

/**
 * Adds request to queue
 * @param request
 * @param type
 * @returns
 */
export function queue(request: string, type: Command): number {
    // Throw error on duplicate requests
    if (request === getLastInQueue(type)) {
        throw new Error(ERROR_MSG.DUPLICATE_REQUEST);
    }

    const turn = getNewQueueTurn(type);
    queueMap[type][turn] = request;

    return turn;
}

/**
 * Gets the last turn in queue
 * @param type
 * @returns
 */
export function getLastIndex(type: Command): number {
    return uniqueIdMap[type];
}

/**
 * Returns the last item in the queue
 * @param type
 * @returns
 */
export function getLastInQueue(type: Command): string | null {
    return queueMap[type]?.[getLastIndex(type)];
}

/**
 * Calculates the new turn for enqueuing
 * @param type
 * @returns
 */
export function getNewQueueTurn(type: Command): number {
    uniqueIdMap[type] = nextTurn(uniqueIdMap[type]);
    return uniqueIdMap[type];
}

/**
 * Gets the next turn in queue
 * @param queue
 * @param turn
 * @returns
 */
export function nextTurn(turn: number): number {
    return turn + 1;
}

/**
 * Moves to the next in queue
 * @param type
 */
export function forwardQueue(type: Command): void {
    const turn = nextTurn(currentTurnMap[type]);

    // Keep playing same loop if it's looping alone
    if (isLoopingAlone(type, turn)) {
        return;
    }

    delete queueMap[type][currentTurnMap[type]];
    currentTurnMap[type] = turn;
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
}

/**
 * Removes petitions from a list of queues
 * @param typeList
 */
export function clearQueueList(...typeList: Command[]): void {
    for (const type of typeList) {
        clearQueue(type);
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
 * Restores the previous values cleared in a list of queues by type
 * @param typeList
 */
export function rollbackClearQueueList(...typeList: Command[]): void {
    for (const type of typeList) {
        rollbackClearQueue(type);
    }
}

/**
 * Checks if there's only one looping request and it should keep going
 * @param type
 * @param nextTurn
 * @returns
 */
function isLoopingAlone(type: Command, nextTurn: number): boolean {
    return type === Command.sendloop && queueMap[type][currentTurnMap[type]] != null && queueMap[type]?.[nextTurn] == null;
}

/**
 * Checks if it's your turn
 * @param turn Queue position
 * @param type Type of queue
 * @returns boolean
 */
function isMyTurn(turn: number, type: Command): boolean {
    return turn === currentTurnMap[type];
}

/**
 * Collision prevention algorithm that separates sendchord and sendloop queues
 * @param currentChordMode The chord mode playing right now
 * @param type Queue type
 * @returns If next petition can be started
 */
function isCollisionFree(currentChordMode: Command, type: Command): boolean {
    // If a chord progression wants to start, check if the current chord mode is sendchord.
    // Since sendchord has priority, this will stay this way until the sendchord queue is empty
    // If a loop wants to start, check if the chord queue still has requests and wait until it's empty ("wait" is done by calling this method each bar)
    // In any other case, with normal queues, move on!
    return (currentChordMode === Command.sendchord && type === Command.sendchord) || type !== Command.sendloop || isQueueEmpty(Command.sendchord);
}
