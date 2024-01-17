import { Parser } from "n3";
import * as WebSocket from 'websocket';
import { EventEmitter } from "events";
import * as CONFIG from '../config/ldes_properties.json';
import { LDESPublisher } from "../service/publishing-stream-to-pod/LDESPublisher";
import { hash_string_md5 } from "../utils/Util";
import { POSTHandler } from "./POSTHandler";
import { RSPQLParser } from "../service/parsers/RSPQLParser";
import { QueryRegistry } from "../service/query-registry/QueryRegistry";
import { TypeIndexLDESLocator } from "../utils/TypeIndexLDESLocator";
import { AggregationFocusExtractor } from "../service/parsers/AggregationFocusExtractor";

export class WebSocketHandler {

    private aggregation_resource_list: any[];
    private readonly aggregation_resource_list_batch_size: number = CONFIG.BUCKET_SIZE;
    private connections: Map<string, WebSocket>;
    private parser: RSPQLParser;
    private n3_parser: Parser;
    public websocket_server: WebSocket.server;
    public event_emitter: EventEmitter;
    public aggregation_publisher: LDESPublisher;
    public logger: any;
    private query_registry: QueryRegistry;

    constructor(websocket_server: WebSocket.server, event_emitter: EventEmitter, aggregation_publisher: LDESPublisher, logger: any) {
        this.aggregation_resource_list = [];
        this.logger = logger;
        this.websocket_server = websocket_server;
        this.event_emitter = event_emitter;
        this.aggregation_publisher = aggregation_publisher;
        this.connections = new Map<string, WebSocket>();
        this.parser = new RSPQLParser();
        this.query_registry = new QueryRegistry();
        this.n3_parser = new Parser({ format: 'N-Triples' });
    }

    public handle_wss() {
        // TODO: find the type of the request object
        console.log(`Handling the websocket server.`);
        this.websocket_server.on('connect', (request: any) => {
            console.log(`Connection received from ${request.remoteAddress}`);
        });
        this.websocket_server.on('request', async (request: any) => {
            let connection = request.accept('solid-stream-aggregator-protocol', request.origin);
            connection.on('message', async (message: WebSocket.Message) => {
                console.log(`Message received from ${connection.remoteAddress}`);
                if (message.type === 'utf8') {
                    let message_utf8 = message.utf8Data;
                    let ws_message = JSON.parse(message_utf8);
                    if (Object.keys(ws_message).includes('query')) {
                        let query: string = ws_message.query;                        
                        let parsed = this.parser.parse(query);
                        let pod_url = parsed.s2r[0].stream_name;
                        this.logger.info({ query_id: query }, `starting_to_find_ldes`);;
                        let ldes_stream = pod_url;
                        this.logger.info({ query_id: query }, `ldes_found`);
                        let ldes_query = query.replace(pod_url, ldes_stream);
                        this.logger.info({ query_id: query }, `stream_name_replaced`);
                        let width = parsed.s2r[0].width;
                        let query_hashed = hash_string_md5(ldes_query);
                        this.connections.set(query_hashed, connection);
                        this.process_query(ldes_query, width);
                    }
                    else if (Object.keys(ws_message).includes('aggregation_event')) {
                        let query_hash = ws_message.query_hash;
                        for (let [key, value] of this.connections) {
                            if (key === query_hash) {
                                this.publish_aggregation_event(ws_message, this.aggregation_publisher);
                                value.send(JSON.stringify(ws_message));
                            }
                        }
                    }
                    else if (Object.keys(ws_message).includes('status')) {
                        let query_hash = ws_message.query_hash;
                        for (let [key, value] of this.connections) {
                            if (key === query_hash) {
                                value.send(JSON.stringify(ws_message));
                            }
                        }
                    }

                    else if (Object.keys(ws_message).includes('type')) {
                        console.log(ws_message);
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
        this.client_response_publisher();
        this.aggregation_event_publisher();
    }

    public async client_response_publisher() {
        this.event_emitter.on('aggregation_event', (object: string) => {
            let event = JSON.parse(object)
            let query_id = event.query_hash;
            let connection = this.connections.get(query_id);
            if (connection) {
                connection.send(event.aggregation_event);
            }
        });
    }
    public publish_aggregation_event(aggregation_event: any, aggregation_publisher: LDESPublisher) {
        let zeroLengthDuration: number = 0;
        let intervalId: NodeJS.Timeout | null = null;

        let event_quad: any = this.n3_parser.parse(aggregation_event.aggregation_event);
        this.aggregation_resource_list.push(event_quad);

        if (this.aggregation_resource_list.length === this.aggregation_resource_list_batch_size) {
            this.logger.info({ query_id: aggregation_event.query_hash }, `publishing_aggregation_event_bucket`);
            aggregation_publisher.publish(
                this.aggregation_resource_list,
                aggregation_event.aggregation_window_from,
                aggregation_event.aggregation_window_to
            );
            this.aggregation_resource_list = [];
        }

        if (this.aggregation_resource_list.length === 0) {
            this.logger.debug(`No aggregation events to publish.`);
        }

        const checkInterval: number = 500; // Check every 500 milliseconds
        intervalId = setInterval(() => {
            if (this.aggregation_resource_list.length === 0) {
                zeroLengthDuration += 500; // Increment the duration by the check interval

                if (zeroLengthDuration >= 5000) {
                    this.logger.info({ query_id: aggregation_event.query_hash }, `aggregation_publishing_has_been_done`);
                    clearInterval(intervalId!); // Clear the interval when threshold reached
                    zeroLengthDuration = 0; // Reset the duration
                }
            } else {
                zeroLengthDuration = 0; // Reset the duration when events are present
            }
        }, checkInterval);
    }

    public aggregation_event_publisher() {
        this.event_emitter.on('aggregation_event', async (object: string) => {
            const parser = new Parser({ format: 'N-Triples' });
            let aggregation_event = JSON.parse(object)
            const event_quad: any = parser.parse(aggregation_event.aggregation_event);
            this.aggregation_resource_list.push(event_quad);
            if (this.aggregation_resource_list.length == this.aggregation_resource_list_batch_size) {
                await this.aggregation_publisher.publish(this.aggregation_resource_list, aggregation_event.aggregation_window_from, aggregation_event.aggregation_window_to);
                this.aggregation_resource_list = [];
            }
            if (this.aggregation_resource_list.length == 0) {
                this.logger.debug(`No aggregation events to publish.`);
                this.aggregation_publisher.update_latest_inbox(this.aggregation_publisher.lilURL);
            }
        });

        this.event_emitter.on('close', () => {
            this.logger.debug(`Closing the aggregation event publisher.`);
        });

        this.event_emitter.on('error', (error: Error) => {
            this.event_emitter.on('error', (error: Error) => {
                this.logger.debug(`Error in aggregation event publisher: ${error}`);
            });

            this.event_emitter.on('end', () => {
                this.logger.debug(`End of aggregation event publisher.`);
            });



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

    public process_query(query: string, width: number) {
        let minutes = width / 60;
        POSTHandler.handle_ws_query(query, minutes, this.query_registry, this.logger);
    }

    public send_test(query: string) {
        let ws = this.connections.get(query);
        if (ws) {
            ws.send(JSON.stringify({ "test": "test", "query": query }));
        }
    }
}