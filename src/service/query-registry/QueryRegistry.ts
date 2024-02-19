import { RSPQLParser } from "../parsers/RSPQLParser";
import { Logger, ILogObj } from "tslog";
import { AggregatorInstantiator } from "../aggregator/AggregatorInstantiator";
import { is_equivalent } from "rspql-query-equivalence";
import { WriteLockArray } from "../../utils/query-registry/Util";
import { hash_string_md5 } from "../../utils/Util";
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
    }
    /**
     *  Register a query in the QueryRegistry.
     * @param {string} rspql_query
     * @returns {*} 
     * @memberof QueryRegistry
     */

    async register_query(rspql_query: string, query_registry: QueryRegistry, from_timestamp: number, to_timestamp: number, logger: any) {
        if (await query_registry.add_query_in_registry(rspql_query, logger)) {
            /*
            The query is not already executing or computed ; it is unique. So, just compute it and send it via the websocket.
            */
            logger.info({}, 'query_is_unique');
            new AggregatorInstantiator(rspql_query, from_timestamp, to_timestamp, logger);
            return true;
        }
        else {
            /*
            The query is already computed and stored in the Solid Stream Aggregator's Solid Pod. So, read from there and send via a websocket.
            TODO : make a result dispatcher module.
            */
            logger.info({}, 'query_is_not_unique');
            this.logger.debug(`The query you have registered is already executing.`);
            return false;
        }

    }

    async add_query_in_registry(rspql_query: string, logger: any) {
        await this.registered_queries.addItem(rspql_query);
        if (this.checkUniqueQuery(rspql_query, logger)) {
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
     * @param {string} query
     * @memberof QueryRegistry
     */
    async add_to_executing_queries(query: string) {
        this.executing_queries.addItem(query);
    }

    /**
     * Checking if the query is unique or if it is isomorphic with an already executing query.
     * @param {string} query
     * @param logger
     * @returns {*} 
     * @memberof QueryRegistry
     */
    checkUniqueQuery(query: string, logger: any) {
        const query_hashed = hash_string_md5(query);
        const registered_queries = this.get_registered_queries();
        const array_length = registered_queries.get_length();
        if (array_length > 1) {
            for (let i = 0; i < array_length; i++) {
                return is_equivalent(query, registered_queries.get_item(i));
            }
        }
        if (array_length === 0) {
            logger.info({ query_hashed }, 'array_length_is_zero');

        }
        logger.info({ query_hashed }, 'isomorphic_check_done')
        return false;
    }

    get_query_registry_length() {
        
    }

    delete_all_queries_from_the_registry() {
        this.registered_queries.delete_all_items();
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