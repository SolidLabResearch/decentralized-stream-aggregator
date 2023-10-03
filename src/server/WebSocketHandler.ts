import { Logger, ILogObj } from "tslog";
import { Parser } from "n3";
import * as WebSocket from 'websocket';
import { EventEmitter } from "events";
import * as CONFIG from '../config/ldes_properties.json';
import { LDESPublisher } from "../service/publishing-stream-to-pod/LDESPublisher";
import { Quad } from "rdflib/lib/tf-types";
import { Quads } from "sparqljs";
import { v4 as uuidv4 } from 'uuid';
import { aggregation_object } from "../service/aggregator/AggregatorInstantiator";
export class WebSocketHandler {

    private aggregation_resource_list: any[];
    private readonly aggregation_resource_list_batch_size: number = CONFIG.BUCKET_SIZE;
    public logger: Logger<ILogObj>;

    constructor() {
        this.aggregation_resource_list = [];
        this.logger = new Logger();
    }

    public handle_wss(websocket_server: WebSocket.server, event_emitter: EventEmitter, aggregation_publisher: LDESPublisher) {
        // TODO: find the type of the request object
        websocket_server.on('request', async (request: any) => {
            let connection = request.accept('echo-protocol', request.origin);
            this.logger.debug(`New connection from ${connection.remoteAddress}`);
            connection.on('message', (message: WebSocket.Message) => {
                if (message.type === 'utf8') {
                    let message_utf8 = message.utf8Data;
                    event_emitter.emit('aggregation_event', message_utf8);
                }
            });
            connection.on('close', (reason_code: string, description: string) => {
                this.logger.debug(`Connection closed from ${connection.remoteAddress}: ${reason_code} - ${description}`);
            });
            connection.on('error', (error: Error) => {
                this.logger.debug(`Error in connection from ${connection.remoteAddress}: ${error}`);
            });
        });
        this.client_response_publisher(event_emitter);
        this.aggregation_event_publisher(event_emitter, aggregation_publisher);
    }

    // public client_response_publisher(event_emitter: EventEmitter, websocket_server: WebSocket.server) {
    //     websocket_server.on('request', async (request: any) => {
    //         let connection = request.accept('echo-protocol', request.origin);
    //         connection.on('message', (message: WebSocket.Message) => {
    //             console.log(`Message received from client: ${message}`);
                
    //             // const query_id = process_query(message.toString());
    //             // associateChannelWithQuery(query_id, connection);

    //         });
    //     });
    // }
    public client_response_publisher(event_emitter: EventEmitter) {
        event_emitter.on('aggregation_event', (object: string) => {
            console.log(object);
            
        });
    }

    public aggregation_event_publisher(event_emitter: EventEmitter, aggregation_publisher: LDESPublisher) {
        event_emitter.on('aggregation_event', (object: string) => {
            console.log(object);
            const parser = new Parser({ format: 'N-Triples' });
            let aggregation_event = JSON.parse(object)
            const event_quad: any = parser.parse(aggregation_event.aggregation_event);
            this.aggregation_resource_list.push(event_quad);
            if (this.aggregation_resource_list.length == this.aggregation_resource_list_batch_size) {
                aggregation_publisher.publish(this.aggregation_resource_list, aggregation_event.aggregation_window_from, aggregation_event.aggregation_window_to);
                this.aggregation_resource_list = [];
            }
            if (this.aggregation_resource_list.length == 0) {
                this.logger.debug(`No aggregation events to publish.`);
            }
        });

        event_emitter.on('close', () => {
            this.logger.debug(`Closing the aggregation event publisher.`);
        });

        event_emitter.on('error', (error: Error) => {
            this.logger.debug(`Error in aggregation event publisher: ${error}`);
        });

        event_emitter.on('end', () => {
            this.logger.debug(`End of aggregation event publisher.`);
        });
    }
}
let queryChannels = new Map<string, WebSocket>();

export function associateChannelWithQuery(queryId: string, ws: WebSocket) {
    queryChannels.set(queryId, ws);
}

export function sendResultToClient(queryId: string, result: any) {
    const ws = queryChannels.get(queryId);
    if (ws) {
        ws.send(JSON.stringify(result));
    }
}

export function process_query(query: string): string {
    const query_id = uuidv4();
    // TODO: add query result here.
    sendResultToClient(query_id, "result");
    return query_id;
}