import * as WebSocket from 'websocket';
export class ResultDispatcher {
    private query_socket_channels: Map<string, any>;

    constructor() {
        this.query_socket_channels = new Map<string, WebSocket.client>();
    }

    // assigning a websocket channel to a specific query.
    public assign_channel_to_query(query_id: string, websocket: WebSocket.client) {
        this.query_socket_channels.set(query_id, websocket);
    }

    // dispatching the result to the associated websocket channel.
    public send_result_to_query_channel(query_id: string, result: string) {
        const websocket = this.query_socket_channels.get(query_id);
        if (websocket !== undefined) {
            websocket.send(JSON.stringify(result));
        }
        else {
            console.log("No websocket channel found for the query: " + query_id);
        }
    }
}