import { IncomingMessage, ServerResponse } from "http";
import { QueryRegistry } from "../service/query-registry/QueryRegistry";
import fs from 'fs';
export class GETHandler {
    public static async handle(req: IncomingMessage, res: ServerResponse, minutes: number, solid_server_url: string, query_registry: QueryRegistry, endpoint_queries: any) {
        switch (req.url) {
            case '/':
                const file = fs.readFileSync('dist/static/index.html');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(file.toString());
                break;
            case '/averageHRPatient1':
                query_registry.register_query(endpoint_queries.get_query('averageHRPatient1'), minutes, solid_server_url, query_registry);
                break;
            case '/averageHRPatient2':
                query_registry.register_query(endpoint_queries.get_query('averageHRPatient2'), minutes, solid_server_url, query_registry);
            default:
                break;
        }
    }
}