import { Mutex } from "./Mutex";

export class WriteLockArray<T> {
    private array: T[];
    private writeMutex: Mutex;

    constructor() {
        this.array = [];
        this.writeMutex = new Mutex();
    }

    // Add an item to the array while holding the write lock
    async addItem(item: T): Promise<void> {
        await this.writeMutex.acquire();
        this.array.push(item);
        this.writeMutex.release();
    }

    // Remove an item from the array while holding the write lock
    async removeItem(item: T): Promise<void> {
        await this.writeMutex.acquire();
        const index = this.array.indexOf(item);
        if (index !== -1) {
            this.array.splice(index, 1);
        }
        this.writeMutex.release();
    }

    // Get a copy of the array for reading
    getArrayCopy(): T[] {
        return [...this.array];
    }

    get_item(index: number): T {
        return this.array[index];
    }

    get_length(): number {
        return this.array.length;
    }
}