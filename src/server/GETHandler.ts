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
        }
            else {
                const file = fs.readFileSync('dist/static/index.html');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(file.toString());
            }

        }

    }
