import { storeToString } from "@treecg/versionawareldesinldp";
import { IncomingMessage, ServerResponse } from "http";
import { SPARQLToRSPQL } from "../service/parsers/SPARQLToRSPQL";
import { QueryRegistry } from "../service/query-registry/QueryRegistry";
import { AggregationDispatcher } from "../service/result-dispatcher/AggregationDispatcher";
import { RequestBody } from "../utils/Types";
import { hash_string_md5 } from "../utils/Util";
const websocketConnection = require('websocket').connection;
const WebSocketClient = require('websocket').client;
const N3 = require('n3');

export class POSTHandler {
    static connection: typeof websocketConnection;
    public static client: any;
    static request_body: RequestBody;
    static sparql_to_rspql: SPARQLToRSPQL;

    constructor() {
        POSTHandler.sparql_to_rspql = new SPARQLToRSPQL();
        POSTHandler.connection = websocketConnection;

        POSTHandler.client = new WebSocketClient();
    }

    public static async handle(req: IncomingMessage, res: ServerResponse, query_registry: QueryRegistry, solid_server_url: string, logger: any) {
        const to_timestamp = new Date().getTime(); // current time
        let post_body: string = '';
        req.on('data', (chunk: Buffer) => {
            post_body = post_body + chunk.toString();
        });
        req.on('end', () => {
            this.request_body = JSON.parse(post_body);
            const body = this.request_body;
            const query = body.query;
            const latest_minutes = body.latest_minutes;
            const query_type = body.query_type;
            const from_timestamp = new Date(to_timestamp - (latest_minutes * 60)).getTime(); // latest minutes ago
            if (query_type === 'rspql') {
                query_registry.register_query(query, query_registry, from_timestamp, to_timestamp, logger);
            }
            else if (query_type === 'sparql') {
                const rspql_query = this.sparql_to_rspql.getRSPQLQuery(query);
                query_registry.register_query(rspql_query, query_registry, from_timestamp, to_timestamp, logger);
            }
            else {
                const notification = {
                    "type": "latest_event_notification",
                    "data": body
                }
                const notification_string = JSON.stringify(notification);
                const notification_object = JSON.parse(notification_string);
                const new_event_with_container_object = {
                    "type": "new_event_with_container_notification",
                    "event": notification_object.data.object,
                    "container": notification_object.data.target
                };
                this.sendToServer(JSON.stringify(new_event_with_container_object));
            }
        });

    }

    public static async handle_ws_query(query: string, width: number, query_registry: QueryRegistry, logger: any, websocket_connections: any) {
        const aggregation_dispatcher = new AggregationDispatcher(query);
        // let to_timestamp = new Date().getTime(); // current time
        // let to_timestamp = new Date("2023-11-15T09:47:09.8120Z").getTime(); // time setup for the testing (the BVP query)
        const to_timestamp = new Date("2024-02-01T18:14:02.8320Z").getTime(); // time setup for the testing (the SKT query)
        const from_timestamp = new Date(to_timestamp - (width)).getTime(); // latest seconds ago
        const query_hashed = hash_string_md5(query);
        const is_query_unique = query_registry.register_query(query, query_registry, from_timestamp, to_timestamp, logger);
        if (await is_query_unique) {
            logger.info({ query_id: query_hashed }, `unique_query_registered`);
        } else {
            logger.info({ query_id: query_hashed }, `non_unique_query_registered`);
            for (const [query, websocket_connection] of websocket_connections) {
                // make it work such that you get the messages directly rather than the location of the websocket connection.
                if (query === query_hashed) {
                    websocket_connection.send(JSON.stringify(`{
                        "type": "status",
                        "status": "duplicate_query",
                        "connection_id": ${websocket_connection}
                    }`));
                    logger.info({ query_id: query_hashed }, `duplicate_query`);
                }
                else {
                    const aggregated_events_exist = await aggregation_dispatcher.if_aggregated_events_exist();
                    if (aggregated_events_exist) {
                        const aggregation_stream = await aggregation_dispatcher.dispatch_aggregated_events({});
                        aggregation_stream.on('data', async (data) => {
                            const store = new N3.Store(data.quads);
                            const aggregation_event = storeToString(store)
                            const object = {
                                query_hash: hash_string_md5(query),
                                aggregation_event: aggregation_event,
                            }
                            const object_string = JSON.stringify(object);
                            this.sendToServer(object_string);
                        });
                    }
                    else {
                        console.log(`The aggregated events do not exist.`);
                    }
                }
            }
        }

    }

    static async connect_with_server(wssURL: string) {
        this.client.connect(wssURL, 'solid-stream-aggregator-protocol');
        this.client.on('connect', (connection: typeof websocketConnection) => {
            POSTHandler.connection = connection;
        });
        this.client.setMaxListeners(Infinity);
        this.client.on('connectFailed', (error: Error) => {
            console.log('Connect Error: ' + error.toString());
        });
    }

    static sendToServer(message: string) {
        if (this.connection.connected) {
            this.connection.sendUTF(message);
        }
        else {
            this.connect_with_server('ws://localhost:8080/').then(() => {
                console.log(`The connection with the websocket server was not established. It is now established.`);
            });
        }
    }
}
