import * as WebSocket from 'websocket';
/**
 * The ResultDispatcher class is responsible for dispatching the result to the query channel.
 * @class ResultDispatcher
 */
export class ResultDispatcher {
    public query_socket_channels: Map<string, any>;

    /**
     * Creates an instance of ResultDispatcher.
     * @memberof ResultDispatcher
     */
    constructor() {
        this.query_socket_channels = new Map<string, WebSocket.client>();
    }

    /**
     * Assign a websocket channel to a specific query.
     * @param {string} query_id - The id of the query.
     * @param {WebSocket.client} websocket - The websocket channel to be assigned.
     * @memberof ResultDispatcher
     */
    public assign_channel_to_query(query_id: string, websocket: WebSocket.client) {
        this.query_socket_channels.set(query_id, websocket);
    }


    /**
     * Send the result to the query channel.
     * @param {string} query_id - The id of the query.
     * @param {string} result - The result to be sent.
     * @returns {boolean} - Returns true if the result is sent, otherwise false if no websocket channel was found for the query id.
     * @memberof ResultDispatcher
     */
    public send_result_to_query_channel(query_id: string, result: string) {
        const websocket = this.query_socket_channels.get(query_id);        
        if (websocket !== undefined) {
            websocket.send(JSON.stringify(result));
            return true;
        }
        else {
            console.log("No websocket channel found for the query: " + query_id);
            return false;
        }
    }
}