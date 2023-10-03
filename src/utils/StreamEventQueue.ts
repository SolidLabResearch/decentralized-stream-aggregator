export class StreamEventQueue<T> {
    public items: {
        event: T;
        timestamp: number;
    }[] = [];

    constructor(items: {
        event: T;
        timestamp: number
    }[]) {
        this.items = items;
    }

    enqueue(event: T, timestamp: number) {
        this.items.push({
            event,
            timestamp
        });
    }

    dequeue(): T | undefined {
        const earliest_event = this.findEarliestEvent();
        if (earliest_event) {
            const index = this.items.indexOf(earliest_event);
            if (index !== -1) {
                this.items.splice(index, 1);
                return earliest_event.event;
            }
            else {
                throw new Error(`The event ${earliest_event} was not found in the queue.`);
            }
        }
    }

    is_empty(): boolean {
        return this.items.length === 0;
    }

    size(): number {
        return this.items.length;
    }


    peek(): T | undefined {
        const earliest_event = this.findEarliestEvent();
        return earliest_event ? earliest_event.event : undefined;
    }

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


export function quick_sort_queue<T>(stream_event_queue: StreamEventQueue<T>): StreamEventQueue<T> {
    if (stream_event_queue.items.length <= 1) {
        return stream_event_queue;
    }

    let middle = Math.floor(stream_event_queue.items.length / 2);
    let pivot = stream_event_queue.items[middle];

    let left = new StreamEventQueue<T>([]);
    let right = new StreamEventQueue<T>([]);
    let equal = new StreamEventQueue<T>([]);

    for (let item of stream_event_queue.items) {
        if (item.timestamp < pivot.timestamp) {
            left.items.push(item);
        } else if (item.timestamp > pivot.timestamp) {
            right.items.push(item);
        }
        else {
            equal.items.push(item);
        }
    }

    let sorted_left = quick_sort_queue(left);
    let sorted_right = quick_sort_queue(right);

    const sorted_queue = new StreamEventQueue<T>([]);
    sorted_queue.items.push(...sorted_left.items);
    sorted_queue.items.push(...equal.items);
    sorted_queue.items.push(...sorted_right.items);

    return sorted_queue;
}
