/**
 * WebSocket channels with a single topic as a reponse to a query request for data from the
 * streams stored in the solid pod.
 * @interface WebSocketChannel
 */
export interface WebSocketChannel {
    id: string;
    responseToQuery: string;
    sender: string;
    channel: string;
    timestamp: number;
}