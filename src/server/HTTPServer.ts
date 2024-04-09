import { createServer, ServerResponse, IncomingMessage, Server } from "http";
import { GETHandler } from "./GETHandler";
import { LDESPublisher } from "../service/publishing-stream-to-pod/LDESPublisher";
import { QueryRegistry } from "../service/query-registry/QueryRegistry";
import { WebSocketHandler } from "./WebSocketHandler";
import * as websocket from 'websocket';
const EventEmitter = require('events');
/**
 * Class for the HTTP Server.
 * @class HTTPServer
 */
export class HTTPServer {
    private readonly http_server: Server;
    public solid_server_url: string;
    public logger: any;
    public dynamic_endpoints: { [key: string]: boolean };
    public query_registry: any;
    public websocket_server: any;
    public aggregation_publisher: any;
    public websocket_handler: any;
    public event_emitter: any;
    /**
     * Creates an instance of HTTPServer.
     * @param {number} http_port - The port on which the HTTP server is to be started.
     * @param {string} solid_server_url - The URL of the Solid Server.
     * @param {*} logger - The logger object.
     * @memberof HTTPServer
     */
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
        this.event_emitter = new EventEmitter();
        this.query_registry = new QueryRegistry();
        this.websocket_handler = new WebSocketHandler(this.websocket_server, this.event_emitter, this.aggregation_publisher, this.logger);
        this.websocket_handler.handle_wss();
        this.websocket_handler.aggregation_event_publisher();
        this.logger.info({}, 'http_server_started');
        console.log('HTTP Server started on port ' + http_port);
    }
    /**
     * Handle the request from the client.
     * Handles the GET and the POST requests from the client.
     * @private
     * @param {IncomingMessage} req - The request from the client.
     * @param {ServerResponse} res - The response to the client.
     * @memberof HTTPServer
     */
    private request_handler(req: IncomingMessage, res: ServerResponse) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
        let body: string = '';
        switch (req.method) {
            case "GET":
                this.logger.info({}, 'http_get_request_received');
                GETHandler.handle(req, res, this.query_registry);
                res.end();
                break;
            case "POST":
                req.on('data', (chunk: Buffer) => {
                    body = body + chunk.toString();
                });
                req.on('end', async () => {
                    const webhook_notification_data = JSON.parse(body);
                    if (webhook_notification_data.type === 'Add') {
                        this.logger.info({}, 'webhook_notification_received');
                        // the target is where a new notification is added into the ldes stream.
                        // LDES stream can be found by stripping the inbox from the target with the slash semantics as described in the Solid Protocol.
                        // Link : https://solidproject.org/TR/protocol#uri-slash-semantics
                        const inbox_where_event_is_added = webhook_notification_data.target;
                        const ldes_stream_where_event_is_added = inbox_where_event_is_added.replace(/\/\d+\/$/, '/');
                        const added_event_location = webhook_notification_data.object;
                        const latest_event_response = await fetch(added_event_location, {
                            method: 'GET',
                            headers: {
                                'Accept': 'text/turtle'
                            }
                        });
                        const latest_event = await latest_event_response.text();
                        this.event_emitter.emit(`${ldes_stream_where_event_is_added}`, latest_event);
                        this.logger.info({}, 'webhook_notification_processed_and_emitted');
                    }
                });
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

    /**
     * Close the HTTP server.
     * @memberof HTTPServer
     */
    public close() {
        this.http_server.close();
        this.logger.info({}, 'http_server_closed');
    }
}