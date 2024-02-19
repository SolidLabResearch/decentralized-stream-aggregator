import { IncomingMessage, ServerResponse } from "http";
import fs from 'fs';
export class GETHandler {

    public static async handle(req: IncomingMessage, res: ServerResponse) {
        if (req.url !== undefined) {
            console.log('Request URL: ' + req.url);
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
