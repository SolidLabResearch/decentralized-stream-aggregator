import { storeToString } from "@treecg/versionawareldesinldp";
import { IncomingMessage, ServerResponse } from "http";
import { Store } from "rdflib";
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
        let to_timestamp = new Date().getTime(); // current time
        req.on('data', (data) => {
            this.request_body = JSON.parse(data);
        });
        req.on('end', () => {
            let body = this.request_body;
            let query = body.query;
            let latest_minutes = body.latest_minutes;
            let query_type = body.query_type;
            let from_timestamp = new Date(to_timestamp - (latest_minutes * 60)).getTime(); // latest minutes ago
            if (query_type === 'rspql') {
                query_registry.register_query(query, query_registry, from_timestamp, to_timestamp, logger);
            }
            else if (query_type === 'sparql') {
                let rspql_query = this.sparql_to_rspql.getRSPQLQuery(query);
                query_registry.register_query(rspql_query, query_registry, from_timestamp, to_timestamp, logger);
            }
            else {
                throw new Error('Query type not supported by the Solid Stream Aggregator.');
            }
        });
    }

    public static async handle_ws_query(query: string, width: number, query_registry: QueryRegistry, logger: any) {
        let aggregation_dispatcher = new AggregationDispatcher(query);
        // let to_timestamp = new Date().getTime(); // current time
        let to_timestamp = new Date("2023-11-15T08:58:12.2870Z").getTime(); // time setup for the testing (the BVP query)
        let from_timestamp = new Date(to_timestamp - (width * 60)).getTime(); // latest minutes ago
        let query_hashed = hash_string_md5(query);
        let is_query_unique = query_registry.register_query(query, query_registry, from_timestamp, to_timestamp, logger);
        if (is_query_unique) {
            logger.info({ query_id: query_hashed }, `unique_query_registered`);
        } else {
            logger.info({ query_id: query_hashed }, `non_unique_query_registered`);
            let aggregated_events_exist = await aggregation_dispatcher.if_aggregated_events_exist();
            if (aggregated_events_exist) {
                let aggregation_stream = await aggregation_dispatcher.dispatch_aggregated_events({
                });
                aggregation_stream.on('data', async (data) => {
                    let store = new N3.Store(data.quads);
                    let aggregation_event = storeToString(store)
                    let object = {
                        query_hash: hash_string_md5(query),
                        aggregation_event: aggregation_event,
                    }
                    let object_string = JSON.stringify(object);
                    this.sendToServer(object_string);
                });
            }
            else {
                console.log(`The aggregated events do not exist.`);
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