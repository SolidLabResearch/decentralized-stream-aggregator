import { Mutex } from "./Mutex";

describe("mutex_class", () => {

    let mutex: Mutex;

    beforeEach(() => {
        mutex = new Mutex();
    });

    it("initializing the Mutex", () => {
        expect(mutex).toBeInstanceOf(Mutex);
    });

    it('acquire_and_release_mutex', async () => {
        await mutex.acquire();
        expect(mutex.isLocked).toBe(true);
        mutex.release();
        expect(mutex.isLocked).toBe(false);
    });

    it('acquire_mutex_twice', async () => {
        await mutex.acquire();
        expect(mutex.isLocked).toBe(true);
        mutex.release();
        expect(mutex.isLocked).toBe(false);
        await mutex.acquire();
        expect(mutex.isLocked).toBe(true);
        mutex.release();
        expect(mutex.isLocked).toBe(false);
    });

    it('should_release_if_no_one_else_in_queue', async () => {
        mutex.release();
        expect(mutex.isLocked).toBe(false);
    });
});