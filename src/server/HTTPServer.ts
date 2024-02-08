import { createServer, ServerResponse, IncomingMessage, Server } from "http";
import { GETHandler } from "./GETHandler";
import { LDESPublisher } from "../service/publishing-stream-to-pod/LDESPublisher";
import { QueryRegistry } from "../service/query-registry/QueryRegistry";
import { EndpointQueries } from "./EndpointQueries";
import { POSTHandler } from "./POSTHandler";
import { WebSocketHandler } from "./WebSocketHandler";
import * as websocket from 'websocket';
const url = require('url');
const EventEmitter = require('events');
const event_emitter = new EventEmitter();

export class HTTPServer {
    private readonly http_server: Server;
    public solid_server_url: string;
    public logger: any;
    public dynamic_endpoints: { [key: string]: boolean };
    public query_registry: any;
    public websocket_server: any;
    public aggregation_publisher: any;
    public endpoint_queries: EndpointQueries;
    public websocket_handler: any;
    constructor(http_port: number, solid_server_url: string, logger: any) {
        this.solid_server_url = solid_server_url;
        this.dynamic_endpoints = {};
        this.http_server = createServer(this.request_handler.bind(this)).listen(http_port);
        this.logger = logger;
        this.websocket_server = new websocket.server({
            httpServer: this.http_server
        });

        this.http_server.keepAliveTimeout = 6000;
        this.aggregation_publisher = new LDESPublisher();
        this.query_registry = new QueryRegistry();
        this.endpoint_queries = new EndpointQueries();
        this.websocket_handler = new WebSocketHandler(this.websocket_server, event_emitter, this.aggregation_publisher, this.logger);
        this.websocket_handler.handle_wss();
        this.websocket_handler.aggregation_event_publisher();
        this.logger.info({}, 'http_server_started');
    }

    private request_handler(req: IncomingMessage, res: ServerResponse) {
        const parsed_url = url.parse(req.url, true);
        const endpoint_name = parsed_url.pathname?.split(1); 
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
        switch (req.method) {
            case "GET":
                const latest_minutes = parsed_url.query.latest_minutes;
                GETHandler.handle(req, res, this.solid_server_url, this.query_registry, this.endpoint_queries, latest_minutes, this.logger);
                res.end();
                break;
            case "POST":
                // TODO : bug that the notification is sent more than once from the solid server.
                let body: string = '';
                req.on('data', (chunk: Buffer) => {
                    body = body + chunk.toString();
                });

                req.on('end', () => {
                    const webhook_notification_data = JSON.parse(body);
                    if (webhook_notification_data.type === 'Add') {
                        const notification = {
                            "type": "latest_event_notification",
                            "data": webhook_notification_data
                        }
                        event_emitter.emit(notification);
                    }
                });

                if (req.url = '/registerQuery') {
                    POSTHandler.handle(req, res, this.query_registry, this.solid_server_url, this.logger);
                }
                break;
            default:
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