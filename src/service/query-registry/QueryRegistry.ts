import { RSPQLParser } from "../parsers/RSPQLParser";
import { Logger, ILogObj } from "tslog";
import { AggregatorInstantiator } from "../aggregator/AggregatorInstantiator";
import { is_equivalent } from "rspql-query-equivalence";
import { WriteLockArray } from "../../utils/query-registry/Util";
const websocketConnection = require('websocket').connection;
const WebSocketClient = require('websocket').client;

export class QueryRegistry {
    registered_queries: WriteLockArray<string>;
    executed_queries: WriteLockArray<string>;
    future_queries: string[];
    executing_queries: WriteLockArray<string>;
    query_count: number;
    parser: RSPQLParser;
    logger: Logger<ILogObj>;
    query_hash_map: Map<string, string>;
    static connection: typeof websocketConnection;
    public static client: any = new WebSocketClient();

    /**
     * Creates an instance of QueryRegistry.
     * @memberof QueryRegistry
     */
    constructor() {
        /**
         * Map of registered queries which are the queries without any analysis by the QueryRegistry but only registered.  
        */
        this.registered_queries = new WriteLockArray<string>();
        /**
         * Array of executing queries which were unique as compared to all the existing queries in the QueryRegistry. 
         */
        this.executing_queries = new WriteLockArray<string>();
        this.executed_queries = new WriteLockArray<string>();
        this.query_hash_map = new Map();
        this.future_queries = new Array<string>();
        this.query_count = 0;
        this.parser = new RSPQLParser();
        this.logger = new Logger();
        QueryRegistry.connect_with_server('ws://localhost:8080').then(() => {
            console.log(`Connection of the QueryRegistry with the websocket server is established.`);
        });
    }
    /**
     *  Register a query in the QueryRegistry.
     *
     * @param {string} rspql_query
     * @return {*} 
     * @memberof QueryRegistry
     */

    register_query(rspql_query: string, query_registry: QueryRegistry, from_timestamp: number, to_timestamp: number) {
        if (query_registry.add_query_in_registry(rspql_query)) {
            /*
            The query is not already executing or computed ; it is unique. So, just compute it and send it via the websocket.
            */
            QueryRegistry.send_to_server(`{
                "status": "unique_query_registered"
            }`);
            new AggregatorInstantiator(rspql_query, from_timestamp, to_timestamp);
            return true;
        }
        else {
            /*
            The query is already computed and stored in the Solid Stream Aggregator's Solid Pod. So, read from there and send via a websocket.
            TODO : make a result dispatcher module.
            */
            this.logger.debug(`The query you have registered is already executing.`);
            QueryRegistry.send_to_server(`{
                "status": "query_already_registered"
            }`);
            return false;
        }

    }

    add_query_in_registry(rspql_query: string) {
        this.registered_queries.addItem(rspql_query);
        if (this.checkUniqueQuery(rspql_query)) {
            /*
            The query you have registered is already executing.
            */
            return false;
        }
        else {
            /*
            The query you have registered is not already executing.
            */
            this.add_to_executing_queries(rspql_query);
            return true;
        }
    }

    /**
     * Add a query to the executing queries.
     *
     * @param {string} query
     * @memberof QueryRegistry
     */
    add_to_executing_queries(query: string) {
        this.executing_queries.addItem(query);
    }

    /**
     * Checking if the query is unique or if it is isomorphic with an already executing query.
     *
     * @param {string} query
     * @return {*} 
     * @memberof QueryRegistry
     */
    checkUniqueQuery(query: string) {
        let registered_queries = this.get_registered_queries();
        let array_length = registered_queries.get_length();
        if (array_length > 1) {
            for (let i = 0; i < array_length; i++) {
                return is_equivalent(query, registered_queries.get_item(i));
            }
        }
        return false;
    }


    get_executing_queries() {
        return this.executing_queries;
    }

    get_registered_queries() {
        return this.registered_queries;
    }

    static send_to_server(message: string) {
        if (this.connection.connected) {
            this.connection.sendUTF(message);
        }
        else {
            this.connect_with_server('ws://localhost:8080').then(() => {
                console.log(`The connection with the websocket server was not established. It is now established.`);
            });
        }
    }

    static async connect_with_server(websocketURL: string) {
        this.client.connect(websocketURL, 'solid-stream-aggregator-protocol');
        this.client.on('connect', (connection: typeof websocketConnection) => {
            QueryRegistry.connection = connection;
        });
        this.client.setMaxListeners(Infinity);
        this.client.on('connectFailed', (error: any) => {
            console.log('Connect Error: ' + error.toString());
        });
    }

}