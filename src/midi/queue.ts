import { COMMANDS, ERROR_MSG, EVENT, EVENT_EMITTER } from '../configuration/constants';
import { CommandType } from '../twitch/chat/types';
import { isEmptyObject } from '../utils/data';

const queueMap: Record<CommandType, Record<number, string | null>> = {
    midihelp: {},
    midion: {},
    midioff: {},
    addchord: {},
    removechord: {},
    chordlist: {},
    sendnote: {},
    sendchord: {},
    sendloop: {},
    sendcc: {},
    cclist: {},
    midivolume: {},
    stoploop: {},
    fullstopmidi: {},
    settempo: {},
    syncmidi: {},
    fetchdb: {}
} as const;

const queueCommitMap: Record<CommandType, Record<number, string | null>> = {
    midihelp: {},
    midion: {},
    midioff: {},
    addchord: {},
    removechord: {},
    chordlist: {},
    sendnote: {},
    sendchord: {},
    sendloop: {},
    sendcc: {},
    cclist: {},
    midivolume: {},
    stoploop: {},
    fullstopmidi: {},
    settempo: {},
    syncmidi: {},
    fetchdb: {}
} as const;

export const currentTurnMap: Record<CommandType, number> = {
    midihelp: 0,
    midion: 0,
    midioff: 0,
    addchord: 0,
    removechord: 0,
    chordlist: 0,
    sendnote: 0,
    sendchord: 0,
    sendloop: 0,
    sendcc: 0,
    cclist: 0,
    midivolume: 0,
    stoploop: 0,
    fullstopmidi: 0,
    settempo: 0,
    syncmidi: 0,
    fetchdb: 0
} as const;

const uniqueIdMap: Record<CommandType, number> = {
    midihelp: -1,
    midion: -1,
    midioff: -1,
    addchord: -1,
    removechord: -1,
    chordlist: -1,
    sendnote: -1,
    sendchord: -1,
    sendloop: -1,
    sendcc: -1,
    cclist: -1,
    midivolume: -1,
    stoploop: -1,
    fullstopmidi: -1,
    settempo: -1,
    syncmidi: -1,
    fetchdb: -1
} as const;

/**
 * Resolves once the bar is starting and your turn is reached
 * It uses Node.js Event Emitters for notifying
 * @param turn
 * @param type
 * @returns An empty promise
 */
export async function isMyTurn(turn: number, type: CommandType): Promise<void> {
    return new Promise((resolve) => {
        const onCommandTurn = (activeMode: 'sendloop' | 'sendchord') => {
            // Either it's a sendchord request on a sendchord context or a sendloop request with no sendchord petitions queued
            const isChordQueueFree = (activeMode === 'sendchord' && type === 'sendchord') || (type === 'sendloop' ? isQueueEmpty('sendchord') : true);
            if (turn === currentTurnMap[type] && isChordQueueFree) {
                EVENT_EMITTER.removeListener(EVENT.BAR_LOOP_CHANGE_EVENT, onCommandTurn);
                resolve();
            }
        };
        EVENT_EMITTER.on(EVENT.BAR_LOOP_CHANGE_EVENT, onCommandTurn);
    });
}

/**
 * Adds chord progression or loop to queue
 * @param chordProgression
 * @param type
 * @returns
 */
export function queue(chordProgression: string, type: CommandType): number {
    // Throw error on duplicate requests
    if (chordProgression === getLastInQueue(type)) {
        throw new Error(ERROR_MSG.DUPLICATE_REQUEST);
    }

    const turn = getNewQueueTurn(type);
    queueMap[type][turn] = chordProgression;

    return turn;
}

/**
 * Gets the last turn in queue
 * @param type
 * @returns
 */
export function getLastIndex(type: CommandType): number {
    return uniqueIdMap[type];
}

/**
 * Returns the last item in the queue
 * @param type
 * @returns
 */
export function getLastInQueue(type: CommandType): string | null {
    return queueMap[type]?.[getLastIndex(type)];
}

/**
 * Calculates the new turn for enqueuing
 * @param type
 * @returns
 */
export function getNewQueueTurn(type: CommandType): number {
    uniqueIdMap[type] = forwardQueue(uniqueIdMap[type]);
    return uniqueIdMap[type];
}

/**
 * Gets the next turn in queue
 * @param queue
 * @param turn
 * @returns
 */
export function forwardQueue(turn: number): number {
    return turn + 1;
}

/**
 * Moves to the next in queue
 * @param type
 */
export function next(type: CommandType): void {
    const nextTurn = forwardQueue(currentTurnMap[type]);

    // Keep playing same loop if it's looping alone
    if (isLoopingAlone(type, nextTurn)) {
        return;
    }

    delete queueMap[type][currentTurnMap[type]];
    currentTurnMap[type] = nextTurn;
}

/**
 * Checks if queue is empty
 * @param type 
 * @returns 
 */
export function isQueueEmpty(type: CommandType): boolean {
    return isEmptyObject(queueMap[type]);
}

/**
 * Removes petitions from a queue by type
 * @param type 
 */
export function clearQueue(type: CommandType): void {
    queueCommitMap[type] = JSON.parse(JSON.stringify(queueMap[type])) as Record<number, string | null>;
    queueMap[type] = {};
}

/**
 * Removes petitions from a list of queues
 * @param typeList 
 */
export function clearQueueList(...typeList: CommandType[]): void {
    for (const type of typeList) {
        clearQueue(type);
    }
}

/**
 * Restores the previous values cleared in a queue by type
 * @param type 
 */
export function rollbackClearQueue(type: CommandType): void {
    const backup = JSON.parse(JSON.stringify(queueCommitMap[type])) as Record<number, string | null>;
    queueMap[type] = { ...backup, ...queueMap[type] };
}

/**
 * Restores the previous values cleared in a list of queues by type
 * @param typeList 
 */
export function rollbackClearQueueList(...typeList: CommandType[]): void {
    for (const type of typeList) {
        rollbackClearQueue(type);
    }
}

/**
 * Clears all queues
 */
export function clearAllQueues(): void {
    for (const type of Object.values(COMMANDS)) {
        clearQueue(type);
    }
}

/**
 * Checks if there's only one looping request and it should keep going
 * @param type 
 * @param nextTurn 
 * @returns 
 */
export function isLoopingAlone(type: CommandType, nextTurn: number): boolean {
    return type === 'sendloop' && queueMap[type][currentTurnMap[type]] != null && queueMap[type]?.[nextTurn] == null;
}

/**
 * Resets all queues
 */
export function resetAllQueues(): void {
    for (const type of Object.values(COMMANDS)) {
        _resetQueue(type);
    }
}

function _resetQueue(type: CommandType): void {
    queueMap[type] = {};
    currentTurnMap[type] = 0;
    uniqueIdMap[type] = -1;
}
