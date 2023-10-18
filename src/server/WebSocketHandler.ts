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
import { hash_string } from "../utils/Util";
import { sleep } from "@treecg/versionawareldesinldp";
import { POSTHandler } from "./POSTHandler";
import { RSPQLParser } from "../service/parsers/RSPQLParser";
import { QueryRegistry } from "../service/query-registry/QueryRegistry";
export class WebSocketHandler {

    private aggregation_resource_list: any[];
    private readonly aggregation_resource_list_batch_size: number = CONFIG.BUCKET_SIZE;
    public logger: Logger<ILogObj>;
    private connections: Map<string, WebSocket>;
    private parser: RSPQLParser;
    private n3_parser: Parser;
    private query_registry: QueryRegistry;

    constructor() {
        this.aggregation_resource_list = [];
        this.logger = new Logger();
        this.connections = new Map<string, WebSocket>();
        this.parser = new RSPQLParser();
        this.query_registry = new QueryRegistry();
        this.n3_parser = new Parser({ format: 'N-Triples' });

    }

    public handle_wss(websocket_server: WebSocket.server, event_emitter: EventEmitter, aggregation_publisher: LDESPublisher) {
        // TODO: find the type of the request object

        websocket_server.on('connect', (request: any) => {
            console.log(request.remoteAddress);

        });

        websocket_server.on('request', async (request: any) => {
            let connection = request.accept('solid-stream-aggregator-protocol', request.origin);
            this.logger.debug(`New connection from ${connection.remoteAddress}`);
            connection.on('message', (message: WebSocket.Message) => {
                if (message.type === 'utf8') {
                    let message_utf8 = message.utf8Data;
                    let ws_message = JSON.parse(message_utf8);
                    if (Object.keys(ws_message).includes('query')) {
                        let parsed = this.parser.parse(ws_message.query);
                        let width = parsed.s2r[0].width;
                        let query_hashed = hash_string(ws_message.query);
                        this.connections.set(query_hashed, connection);
                        this.process_query(ws_message.query, width);
                    }
                    else if (Object.keys(ws_message).includes('aggregation_event')) {
                        let query_hash = ws_message.query_hash;
                        for (let [key, value] of this.connections) {
                            if (key === query_hash) {
                                this.publish_aggregation_event(ws_message, aggregation_publisher);
                                value.send(JSON.stringify(ws_message));
                            }
                        }
                    }
                    else {
                        throw new Error('Unknown message, not handled.');
                    }
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

    public async client_response_publisher(event_emitter: EventEmitter) {
        event_emitter.on('aggregation_event', (object: string) => {
            let event = JSON.parse(object)
            let query_id = event.query_hash;
            let connection = this.connections.get(query_id);
            if (connection) {
                connection.send(event.aggregation_event);
            }
        });
    }

    public aggregation_event_publisher(event_emitter: EventEmitter, aggregation_publisher: LDESPublisher) {
        event_emitter.on('aggregation_event', (object: string) => {
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

    public associate_channel_with_query(query_id: string, ws: WebSocket) {
        this.connections.set(query_id, ws);
    }

    public send_result_to_client(query_id: string, result: any) {
        const ws = this.connections.get(query_id);
        if (ws) {
            ws.send(JSON.stringify(result));
        }
        else {
            this.logger.debug(`No connection found for query id: ${query_id}`);
        }
    }

    public publish_aggregation_event(aggregation_event: any, aggregation_publisher: LDESPublisher) {        
        let event_quad: any = this.n3_parser.parse(aggregation_event.aggregation_event);
        this.aggregation_resource_list.push(event_quad);
        if (this.aggregation_resource_list.length == this.aggregation_resource_list_batch_size) {
            aggregation_publisher.publish(this.aggregation_resource_list, aggregation_event.aggregation_window_from, aggregation_event.aggregation_window_to);
            this.aggregation_resource_list = [];
        }
        if (this.aggregation_resource_list.length == 0) {
            this.logger.debug(`No aggregation events to publish.`);
        }
    }

    public process_query(query: string, width: number) {
        let minutes = width / 60;
        POSTHandler.handle_ws_query(query, minutes, this.query_registry);
        // POSTHandler.handle()
    }

    public send_test(query: string) {
        let ws = this.connections.get(query);
        if (ws) {
            ws.send(JSON.stringify({ "test": "test", "query": query }));
        }
    }
}
