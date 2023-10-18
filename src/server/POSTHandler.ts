import { IncomingMessage, ServerResponse } from "http";
import { SPARQLToRSPQL } from "../service/parsers/SPARQLToRSPQL";
import { QueryRegistry } from "../service/query-registry/QueryRegistry";
import { RequestBody } from "../utils/Types";

export class POSTHandler {

    static request_body: RequestBody;
    static sparql_to_rspql: SPARQLToRSPQL;

    constructor() {
        POSTHandler.sparql_to_rspql = new SPARQLToRSPQL();
    }

    public static async handle(req: IncomingMessage, res: ServerResponse, query_registry: QueryRegistry, solid_server_url: string) {
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
                query_registry.register_query(query, query_registry, from_timestamp, to_timestamp);
            }
            else if (query_type === 'sparql') {
                let rspql_query = this.sparql_to_rspql.getRSPQLQuery(query);
                query_registry.register_query(rspql_query, query_registry, from_timestamp, to_timestamp);
            }
            else {
                throw new Error('Query type not supported by the Solid Stream Aggregator.');
            }
        });
    }

    public static handle_ws_query(query: string, width: number, query_registry: QueryRegistry) {
        let to_timestamp = new Date().getTime(); // current time
        let from_timestamp = new Date(to_timestamp - (width * 60)).getTime(); // latest minutes ago
        query_registry.register_query(query, query_registry, from_timestamp, to_timestamp);
    
    }
}