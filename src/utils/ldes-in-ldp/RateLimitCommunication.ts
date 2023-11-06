import axios, { AxiosResponse } from 'axios';

export class RateLimitCommunication {

    private request_per_second: number;
    private requestQueue: ( () => void)[] = [];
    private is_processing:boolean = false;

    constructor(request_per_second: number) {
        this.request_per_second = request_per_second;
    }

    async getRateLimited(resource: string):Promise<AxiosResponse> {
        return new Promise(async (resolve, reject) => {
            this.requestQueue.push(async () => {
                try {
                    const response = await axios.get(resource);
                    resolve(response); // Resolve the promise with the response
                } catch (error: any) {
                    console.error('Request failed:', error.message);
                    reject(error); // Reject the promise with the error
                }
            });
            this.process_queue();
        });
    }
    

    async process_queue() {
        if (!this.is_processing){
            this.is_processing = true;
            while (this.requestQueue.length > 0){
                const request_function = this.requestQueue.shift();
                if (request_function){
                    request_function();
                    await new Promise((resolve) => setTimeout(resolve, 1000/ this.request_per_second));
                }
            }
            this.is_processing = false;
        }
    }
}