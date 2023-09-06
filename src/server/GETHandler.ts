import { IncomingMessage, ServerResponse } from "http";
import { QueryRegistry } from "../service/query-registry/QueryRegistry";
import fs from 'fs';
export class GETHandler {
    public static async handle(req: IncomingMessage, res: ServerResponse, solid_server_url: string, query_registry: QueryRegistry, endpoint_queries: any, latest_minutes: number) {
        let to_timestamp = new Date().getTime(); // current time
        let from_timestamp = new Date(to_timestamp - (latest_minutes * 60)).getTime(); // latest minutes ago
        console.log(`from: ${from_timestamp}, to: ${to_timestamp}`);
        if (req.url !== undefined) {
            let endpoint = req.url.split('?')[0];
            if (endpoint === '/averageHRPatient1') {
                query_registry.register_query(endpoint_queries.get_query('averageHRPatient1', new Date(from_timestamp), new Date(to_timestamp)), solid_server_url, query_registry, from_timestamp, to_timestamp);
            }
            else if (endpoint === '/averageHRPatient2') {
                query_registry.register_query(endpoint_queries.get_query('averageHRPatient2', new Date(from_timestamp), new Date(to_timestamp)), solid_server_url, query_registry, from_timestamp, to_timestamp);
            }
            else if (endpoint === '/averageHRPatientMultiple') {
                let query = endpoint_queries.get_query('averageHRPatientMultiple', new Date(from_timestamp), new Date(to_timestamp));
                console.log(`Query is`, query);
                query_registry.register_query(query, solid_server_url, query_registry, from_timestamp, to_timestamp);
            }
            else {
                const file = fs.readFileSync('dist/static/index.html');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(file.toString());
            }

        }

    }
}