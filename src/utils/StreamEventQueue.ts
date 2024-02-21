/**
 * A queue for storing events in a stream.
 * @class StreamEventQueue
 * @template T
 */
export class StreamEventQueue<T> {
    public items: {
        event: T;
        timestamp: number;
    }[] = [];

    /**
     * Creates an instance of StreamEventQueue.
     * @template T - The type of the event.
     * @param {{
     *         event: T;
     *         timestamp: number
     *     }[]} items - The items to be enqueued.
     * @memberof StreamEventQueue
     */
    constructor(items: {
        event: T;
        timestamp: number
    }[]) {
        this.items = items;
    }

    /**
     * Enqueue an event to the queue.
     * @template T - The type of the event.
     * @param {T} event - The event to be enqueued.
     * @param {number} timestamp - The timestamp of the event.
     * @returns {void} - Enqueued event in the items queue.
     * @memberof StreamEventQueue
     */
    enqueue(event: T, timestamp: number) {
        this.items.push({
            event,
            timestamp
        });
    }
    
    /**
     * Dequeue an event from the queue.
     * @template T - The type of the event.
     * @returns {(T | undefined)} - The dequeued event.
     * @memberof StreamEventQueue
     */
    dequeue(): T | undefined {
        const earliest_event = this.findEarliestEvent();
        if (earliest_event) {
            const index = this.items.indexOf(earliest_event);
            if (index !== -1) {
                this.items.splice(index, 1);
                return earliest_event as T;
            }
            else {
                throw new Error(`The event ${earliest_event} was not found in the queue.`);
            }
        }
        return undefined;
    }

    /**
     * Check if the queue is empty.
     * @returns {boolean} - True if the queue is empty, false otherwise.
     * @memberof StreamEventQueue
     */
    is_empty(): boolean {
        return this.items.length === 0;
    }


    /**
     * Get the size of the queue.
     * @returns {number} - The size of the queue.
     * @memberof StreamEventQueue
     */
    size(): number {
        return this.items.length;
    }


    /**
     * Peek at event in the queue.
     * @template T - The type of the event.
     * @returns {T} - {T | undefined}. 
     * @memberof StreamEventQueue
     */
    peek(): T | undefined {
        const earliest_event = this.findEarliestEvent();
        return earliest_event ? earliest_event.event : undefined;
    }

    /**
     * Find the earliest event in the queue.
     * @private
     * @template T - The type of the event.
     * @returns {({
     *         event: T;
     *         timestamp: number
     *     } | undefined)} - The earliest event in the queue with its timestamp.
     * @memberof StreamEventQueue
     */
    private findEarliestEvent(): {
        event: T;
        timestamp: number
    } | undefined {
        let earliest_event: {
            event: T;
            timestamp: number
        } | undefined = undefined;

        for (const item of this.items) {
            if (!earliest_event || item.timestamp < earliest_event.timestamp) {
                earliest_event = item;
            }
        }
        return earliest_event;
    }
}


/**
 * Sort a queue using the quick sort algorithm.
 * @template T - The type of the event.
 * @param {StreamEventQueue<T>} stream_event_queue - The queue to be sorted.
 * @returns {StreamEventQueue<T>} - The sorted queue.
 */
export function quick_sort_queue<T>(stream_event_queue: StreamEventQueue<T>): StreamEventQueue<T> {
    if (stream_event_queue.items.length <= 1) {
        return stream_event_queue;
    }

    const middle = Math.floor(stream_event_queue.items.length / 2);
    const pivot = stream_event_queue.items[middle];

    const left = new StreamEventQueue<T>([]);
    const right = new StreamEventQueue<T>([]);
    const equal = new StreamEventQueue<T>([]);

    for (const item of stream_event_queue.items) {
        if (item.timestamp < pivot.timestamp) {
            left.items.push(item);
        } else if (item.timestamp > pivot.timestamp) {
            right.items.push(item);
        }
        else {
            equal.items.push(item);
        }
    }

    const sorted_left = quick_sort_queue(left);
    const sorted_right = quick_sort_queue(right);

    const sorted_queue = new StreamEventQueue<T>([]);
    sorted_queue.items.push(...sorted_left.items);
    sorted_queue.items.push(...equal.items);
    sorted_queue.items.push(...sorted_right.items);

    return sorted_queue;
}