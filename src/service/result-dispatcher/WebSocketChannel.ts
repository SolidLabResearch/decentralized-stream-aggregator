/*
WebSocket channels with a single topic as a reponse to a query request for data from the 
streams stored in the solid pod.
*/

export interface WebSocketChannel {
    /*
    identifier for the channel
    */
    id: string;
    /*
    the query the channel is reponding to
    */
    responseToQuery: string;
    /*
    sender of the query results
    */
    sender: string;
    /*
    channel to receive the query results
    */
    channel: string;
    /*
    the timestamp of the channel creation
    */
    timestamp: number;
}