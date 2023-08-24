import { createServer, ServerResponse, IncomingMessage } from "http";
import { GETHandler } from "./GETHandler";
import { Logger, ILogObj } from "tslog";
import { LDESPublisher } from "../service/publishing-stream-to-pod/LDESPublisher";
import { QueryRegistry } from "../service/query-registry/QueryRegistry";
import { EndpointQueries } from "./EndpointQueries";
import { WebSocketHandler } from "./WebSocketHandler";
const websocket = require('websocket');
const url = require('url');
const EventEmitter = require('events');
const event_emitter = new EventEmitter();
export class HTTPServer {
    private readonly http_server: any;
    public solid_server_url: string;
    public logger: Logger<ILogObj>;
    public query_registry: any;
    public websocket_server: any;
    public aggregation_publisher: any;
    public endpoint_queries: EndpointQueries;
    public websocket_handler: any;
    constructor(http_port: number, solid_server_url: string) {
        this.solid_server_url = solid_server_url;
        this.http_server = createServer(this.request_handler.bind(this)).listen(http_port);
        this.logger = new Logger();
        this.websocket_server = new websocket.server({
            httpServer: this.http_server
        });
        this.aggregation_publisher = new LDESPublisher();
        this.query_registry = new QueryRegistry();
        this.endpoint_queries = new EndpointQueries();
        this.websocket_handler = new WebSocketHandler();
        this.websocket_handler.handle_wss(this.websocket_server, event_emitter);
        this.websocket_handler.aggregation_event_publisher(event_emitter, this.aggregation_publisher);
    }

    private request_handler(req: IncomingMessage, res: ServerResponse) {
        const parsed_url = url.parse(req.url, true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
        switch (req.method) {
            case "GET":
                console.log(`value of latest minutes: ${parsed_url.query.latest_minutes}`);
                let latest_minutes = parsed_url.query.latest_minutes;
                GETHandler.handle(req, res, this.solid_server_url, this.query_registry, this.endpoint_queries, latest_minutes);
                res.end();
                break;
            default:
                this.logger.debug(`Such request is not supported by the server.`)
                res.writeHead(405, { 'Content-Type': 'text/plain' });
                break;
        }
        if (req.method === 'OPTIONS') {
            res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS, GET',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Length': 0
            });
        }
        res.end();
    }
}