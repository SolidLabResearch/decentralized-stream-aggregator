import { Mutex } from "./Mutex";

/**
 * Represents an array that supports write locking for concurrent access.
 * @template T The type of items stored in the array.
 */
export class WriteLockArray<T> {
    private array: T[];
    private writeMutex: Mutex;

    /**
     * Creates an instance of WriteLockArray.
     * Assigns an empty array to the array property and
     * creates a new Mutex instance for the write lock.
     * @memberof WriteLockArray
     */
    constructor() {
        this.array = [];
        this.writeMutex = new Mutex();
    }

    /**
     * Adds an item to the array while holding the write lock.
     * @param {T} item - The item to be added.
     * @returns {*}  {Promise<void>} - Void promise when the item is added.
     * @memberof WriteLockArray
     */
    async addItem(item: T): Promise<void> {
        await this.writeMutex.acquire();
        this.array.push(item);
        this.writeMutex.release();
    }

    /**
     * Removes an item from the array while holding the write lock.
     * @param {T} item - The item to be removed.
     * @returns {*} {Promise<void>} - Void promise when the item is removed.
     * @memberof WriteLockArray
     */
    async removeItem(item: T): Promise<void> {
        await this.writeMutex.acquire();
        const index = this.array.indexOf(item);
        if (index !== -1) {
            this.array.splice(index, 1);
        }
        this.writeMutex.release();
    }

    /**
     * Returns a copy of the array.
     * @returns {*} {T[]} - A copy of the array.
     * @memberof WriteLockArray
     */
    getArrayCopy(): T[] {
        return [...this.array];
    }


    /**
     * Returns the item at the specified index.
     * @param {number} index - The index of the item to be returned.
     * @returns {*} - The item at the specified index. 
     * @memberof WriteLockArray
     */
    get_item(index: number): T {
        return this.array[index];
    }

    /**
     * Returns the length of the array.
     * @returns {*} - The length of the array.
     * @memberof WriteLockArray
     */
    get_length(): number {
        return this.array.length;
    }

    /**
     * Deletes all items from the array.
     * @memberof WriteLockArray
     * @returns {void} - Deletes all items from the array.
     */
    delete_all_items(): void {
        this.array = [];
    }
}