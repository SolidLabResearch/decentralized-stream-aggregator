export class Mutex {
    private isLocked: boolean = false;
    private queue: Array<() => void> = [];

    // Acquire the mutex
    async acquire(): Promise<void> {
        return new Promise<void>((resolve) => {
            const acquireLock = () => {
                if (!this.isLocked) {
                    this.isLocked = true;
                    resolve();
                } else {
                    this.queue.push(acquireLock);
                }
            };
            acquireLock();
        });
    }

    // Release the mutex
    release() {
        if (this.isLocked) {
            this.isLocked = false;
            const next = this.queue.shift();
            if (next) {
                next();
            }
        }
    }
}
