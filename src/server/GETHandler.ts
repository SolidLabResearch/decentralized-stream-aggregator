import { IncomingMessage, ServerResponse } from "http";
import fs from 'fs';
import { QueryRegistry } from "../service/query-registry/QueryRegistry";
export class GETHandler {

    public static async handle(req: IncomingMessage, res: ServerResponse, query_registry: QueryRegistry) {
        if (req.url !== undefined) {
            if(req.url === '/clearQueryRegistry'){
                await query_registry.delete_all_queries_from_the_registry();
                res.write('Query registry cleared');
            }
        }
        else {
            const endpoint = req.url;
            console.log('Endpoint: ' + endpoint);
            const file = fs.readFileSync('dist/static/index.html');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(file.toString());
        }

    }

}
