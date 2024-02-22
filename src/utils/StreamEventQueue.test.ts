import { quick_sort_queue, StreamEventQueue } from "./StreamEventQueue";

describe("stream_event_queue", () => {
    it('should_enqueue_and_dequeue', async () => {
        const event_queue = new StreamEventQueue<number>([]);
        event_queue.enqueue(1, 100);
        event_queue.enqueue(2, 200);
        console.log(event_queue);

        expect(event_queue.size()).toBe(2);
        event_queue.dequeue();
        expect(event_queue.size()).toBe(1);
        event_queue.dequeue();
        expect(event_queue.size()).toBe(0);
        event_queue.dequeue();
        expect(event_queue.dequeue()).toBe(undefined);
    });

    it('should_check_if_queue_is_empty', async () => {
        const event_queue = new StreamEventQueue<number>([]);
        expect(event_queue.is_empty()).toBe(true);
        event_queue.enqueue(1, 100);
        expect(event_queue.is_empty()).toBe(false);
        event_queue.dequeue();
        expect(event_queue.is_empty()).toBe(true);
    });

    it('should_peek_at_earliest_event', () => {
        const event_queue = new StreamEventQueue<number>([]);
        event_queue.enqueue(1, 100);
        event_queue.enqueue(2, 200);
        expect(event_queue.peek()).toBe(1);
        event_queue.dequeue();
        expect(event_queue.peek()).toBe(2);
        event_queue.dequeue();
        expect(event_queue.peek()).toBe(undefined);
    });


    it('should_return_size_of_queue', () => {
        const event_queue = new StreamEventQueue<number>([]);
        expect(event_queue.size()).toBe(0);
        event_queue.enqueue(1, 100);
        expect(event_queue.size()).toBe(1);
        event_queue.enqueue(2, 200);
        expect(event_queue.size()).toBe(2);
        event_queue.dequeue();
        expect(event_queue.size()).toBe(1);
        event_queue.dequeue();
        expect(event_queue.size()).toBe(0);
    });
});

describe('sort_event_queue', () => {
    it('should_sort_events_by_time_ascending_order', () => {

        const unsorted_events = [
            { event: 1, timestamp: 100 },
            { event: 2, timestamp: 200 },
            { event: 3, timestamp: 50 },
            { event: 4, timestamp: 150 },
            { event: 5, timestamp: 250 },
            { event: 6, timestamp: 300 },
            { event: 7, timestamp: 250 },
            { event: 8, timestamp: 200 },
        ];

        const unsorted_queue = new StreamEventQueue<number>(unsorted_events);
        const sorted_queue = quick_sort_queue(unsorted_queue);      
        const first_event = sorted_queue.dequeue();
        expect(first_event).toStrictEqual({event: 3, timestamp: 50 });
        
    });

    it('should_handle_an_empty_queue', () => {
        const empty_queue = new StreamEventQueue<number>([]);
        const sorted_queue = quick_sort_queue(empty_queue);
        const sorted_events = sorted_queue;
        expect(sorted_events.size()).toBe(0);
    });

    it('should_handle_a_queue_with_one_event', () => {
        const single_event_queue = new StreamEventQueue<number>([{ event: 1, timestamp: 100 }]);
        const sorted_queue = quick_sort_queue(single_event_queue);
        const sorted_events = sorted_queue;
        expect(sorted_events.size()).toBe(1);
        expect(sorted_events.dequeue()).toStrictEqual({ event: 1, timestamp: 100 });
    });
})