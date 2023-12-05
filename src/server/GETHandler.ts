import { IncomingMessage, ServerResponse } from "http";
import { QueryRegistry } from "../service/query-registry/QueryRegistry";
import fs from 'fs';
import { EndpointQueries } from "./EndpointQueries";
export class GETHandler {
    public static async handle(req: IncomingMessage, res: ServerResponse, solid_server_url: string, query_registry: QueryRegistry, endpoint_queries: EndpointQueries, latest_minutes: number, logger: any) {
        let to_timestamp = new Date().getTime(); // current time
        let from_timestamp = new Date(to_timestamp - (latest_minutes * 60)).getTime(); // latest minutes ago
        if (req.url !== undefined) {
            let endpoint = req.url.split('?')[0];
            if (endpoint === '/averageHRPatient1') {
                query_registry.register_query(endpoint_queries.get_query('averageHRPatient1', new Date(from_timestamp), new Date(to_timestamp)), query_registry, from_timestamp, to_timestamp, logger);
            }
            else if (endpoint === '/averageHRPatient2') {
                query_registry.register_query(endpoint_queries.get_query('averageHRPatient2', new Date(from_timestamp), new Date(to_timestamp)), query_registry, from_timestamp, to_timestamp, logger);
            }
            else if (endpoint === '/averageHRPatientMultiple') {
                let query = endpoint_queries.get_query('averageHRPatientMultiple', new Date(from_timestamp), new Date(to_timestamp));
                query_registry.register_query(query, query_registry, from_timestamp, to_timestamp, logger);
            }
            else {
                const file = fs.readFileSync('dist/static/index.html');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(file.toString());
            }

        }

    }
}