import { ERROR_MSG } from '../../configuration/constants.js';
import { ResponseStatus, Result } from '../../types/generic.js';
import { Queue, QueueNode } from '../interface.js';

export class GenericQueue<T> implements Queue<T> {
    private _queueMap: Map<number, QueueNode<T>>;
    private _currentTurn: number;
    private _lastQueuedTurn: number;

    constructor() {
        // Initialize variables
        this._queueMap = new Map();
        this._currentTurn = 0;
        this._lastQueuedTurn = -1;
    }

    isMyTurn(turn: number): Result<boolean> {
        return [turn === this._currentTurn, ResponseStatus.Ok];
    }
    tagEntries(): Result<[turn: number, tag: string][]> {
        const tagEntries: Array<[turn: number, tag: string]> = [];
        for (const [turn, { tag }] of this._queueMap.entries()) {
            tagEntries.push([turn, tag]);
        }
        return [tagEntries, ResponseStatus.Ok];
    }
    has(turn: number): Result<boolean> {
        return [this._queueMap.has(turn), ResponseStatus.Ok];
    }
    getCurrentTag(): Result<string | null> {
        const current = this._queueMap.get(this._currentTurn);
        if (current == null) {
            return [null, ResponseStatus.Error];
        }
        return [current.tag, ResponseStatus.Ok];
    }
    getTag(turn: number): Result<string | null> {
        const current = this._queueMap.get(turn);
        if (current == null) {
            return [null, ResponseStatus.Error];
        }
        return [current.tag, ResponseStatus.Ok];
    }
    get(turn: number): Result<T | null> {
        const current = this._queueMap.get(turn);
        if (current == null) {
            return [null, ResponseStatus.Error];
        }
        return [current.value, ResponseStatus.Ok];
    }

    isCurrentLast(): Result<boolean> {
        const currentNode = this._queueMap.get(this._currentTurn);
        // Initial case where currentTurn is empty
        if (currentNode == null) {
            return [true, ResponseStatus.Error];
        }

        const nextNode = this._queueMap.get(currentNode.nextTurn);
        return [nextNode == null, ResponseStatus.Ok];
    }

    enqueue(tag: string, value: T): Result<number> {
        // Throw error on duplicate requests
        const [lastNode] = this._getLastInQueue();
        if (tag === lastNode?.tag) {
            throw new Error(ERROR_MSG.DUPLICATE_REQUEST());
        }

        // Get turns
        const previousTurn = this._lastQueuedTurn;
        const insertTurn = this._getNewTurn();
        const nextTurn = insertTurn + 1;

        this._queueMap.set(insertTurn, {
            tag,
            value,
            previousTurn,
            nextTurn
        });

        return [insertTurn, ResponseStatus.Ok];
    }
    dequeue(turn: number): Result<null> {
        // If out of bounds
        if (turn < 0 || turn > this._lastQueuedTurn) {
            return [null, ResponseStatus.Error];
        }

        // Obtain node data
        const selectedNode = this._queueMap.get(turn);
        if (selectedNode == null) {
            return [null, ResponseStatus.Error];
        }
        const { previousTurn, nextTurn } = selectedNode;

        // Delete node
        const deleteOk = this._queueMap.delete(turn);
        const status = deleteOk ? ResponseStatus.Ok : ResponseStatus.Error;

        // If turn is 0, no need to move index in previous node
        if (turn === 0) {
            return [null, status];
        }

        // Re-link previous node
        const previousNode = this._queueMap.get(previousTurn);
        // This should not happen
        if (previousNode == null) {
            return [null, ResponseStatus.Error];
        }
        // Apply deleted node nextTurn to previous node
        this._queueMap.set(previousTurn, { ...previousNode, nextTurn });

        return [null, status];
    }
    getCurrent(): Result<T | null> {
        const current = this._queueMap.get(this._currentTurn);
        if (current == null) {
            return [null, ResponseStatus.Error];
        }
        return [current.value, ResponseStatus.Ok];
    }
    forward(): Result<null> {
        this._currentTurn++;
        return [null, ResponseStatus.Ok];
    }
    clear(): Result<null> {
        this._queueMap = new Map();
        return [null, ResponseStatus.Ok];
    }
    getNextTurn(): Result<number> {
        const currentItem = this._queueMap.get(this._currentTurn);
        if (currentItem == null) {
            return [this._currentTurn + 1, ResponseStatus.Ok];
        }
        return [currentItem.nextTurn, ResponseStatus.Ok];
    }
    getCurrentTurn(): Result<number> {
        return [this._currentTurn, ResponseStatus.Ok];
    }
    isEmpty(): Result<boolean> {
        return [this._queueMap.size === 0, ResponseStatus.Ok];
    }
    _getNewTurn(): number {
        this._lastQueuedTurn++;
        return this._lastQueuedTurn;
    }
    _getLastInQueue(): Result<QueueNode<T> | null> {
        const queueNode = this._queueMap.get(this._lastQueuedTurn);

        if (queueNode == null) {
            return [null, ResponseStatus.Error];
        }

        return [queueNode, ResponseStatus.Ok];
    }
}
