import { storeToString } from "@treecg/versionawareldesinldp";
import { SPARQLToRSPQL } from "../service/parsers/SPARQLToRSPQL";
import { QueryRegistry } from "../service/query-registry/QueryRegistry";
import { AggregationDispatcher } from "../service/result-dispatcher/AggregationDispatcher";
import { RequestBody } from "../utils/Types";
import { hash_string_md5 } from "../utils/Util";
const websocketConnection = require('websocket').connection;
const WebSocketClient = require('websocket').client;
const N3 = require('n3');
/**
 * Class for handling the POST request from the client.
 * @class POSTHandler
 */
export class POSTHandler {
    static connection: typeof websocketConnection;
    public static client: any;
    static request_body: RequestBody;
    static sparql_to_rspql: SPARQLToRSPQL;
    /**
     * Creates an instance of POSTHandler.
     * @memberof POSTHandler
     */
    constructor() {
        POSTHandler.sparql_to_rspql = new SPARQLToRSPQL();
        POSTHandler.connection = websocketConnection;

        POSTHandler.client = new WebSocketClient();
    }

    /**
     * Handle the Websocket query from the client.
     * It checks if the query is unique and if it is, then it registers the query in the QueryRegistry and if it is not, then it sends the aggregated events to the client.
     * The non unique query is the query that is already registered in the QueryRegistry, and it uses the Function Ontology Description from the Solid Stream Aggregator's Solid Pod
     * To get the aggregated events and send them to the client.
     * @static
     * @param {string} query - The query to be handled (RSPQL or SPARQL).
     * @param {number} width - The width of the window.
     * @param {QueryRegistry} query_registry - The QueryRegistry object.
     * @param {*} logger - The logger object.
     * @param {any} websocket_connections - The Websocket connections.
     * @param {string} query_type - The type of the query (either historical+live or live).
     * @param {any} event_emitter - The event emitter object.
     * @memberof POSTHandler
     */
    public static async handle_ws_query(query: string, width: number, query_registry: QueryRegistry, logger: any, websocket_connections: any, query_type: string, event_emitter: any) {
        const aggregation_dispatcher = new AggregationDispatcher(query);
        // let to_timestamp = new Date().getTime(); // current time
        // let to_timestamp = new Date("2023-11-15T09:47:09.8120Z").getTime(); // time setup for the testing (the BVP query)
        const to_timestamp = new Date("2024-02-01T18:14:02.8320Z").getTime(); // time setup for the testing (the SKT query)
        const from_timestamp = new Date(to_timestamp - (width)).getTime(); // latest seconds ago
        const query_hashed = hash_string_md5(query);
        const is_query_unique = query_registry.register_query(query, query_registry, from_timestamp, to_timestamp, logger, query_type, event_emitter);
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
    /**
     * Connect with the Websocket server of the Solid Stream Aggregator.
     * @static
     * @param {string} wssURL - The URL of the Websocket server.
     * @memberof POSTHandler
     */
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
    /**
     * Send a message to the Websocket server of the Solid Stream Aggregator.
     * @static
     * @param {string} message - The message to be sent to the server.
     * @memberof POSTHandler
     */
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
