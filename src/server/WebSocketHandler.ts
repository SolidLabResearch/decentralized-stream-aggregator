import { Logger, ILogObj } from "tslog";
import { Parser } from "n3";
export class WebSocketHandler {

    private aggregation_resource_list: any = [];
    private readonly aggregation_resource_list_batch_size: number = 10;
    public logger: Logger<ILogObj>;

    constructor() {
        this.logger = new Logger();
    }

    public handle_wss(websocket_server: any, event_emitter: any, aggregation_publisher: any) {
        websocket_server.on('request', async (request: any) => {
            let connection = request.accept('echo-protocol', request.origin);
            this.logger.debug(`New connection from ${connection.remoteAddress}`);
            connection.on('message', (message: any) => {
                if (message.type === 'utf8') {
                    let message_utf8 = message.utf8Data;
                    event_emitter.emit('aggregation_event', message_utf8);
                }
            });
            connection.on('close', (reason_code: any, description: any) => {
                this.logger.debug(`Connection closed from ${connection.remoteAddress}: ${reason_code} - ${description}`);
            });
        });
        this.aggregation_event_publisher(event_emitter, aggregation_publisher);
    }

    public aggregation_event_publisher(event_emitter: any, aggregation_publisher: any) {
        event_emitter.on('aggregation_event', (message: any) => {
            const parser = new Parser({ format: 'N-Triples' });
            const triple_store = parser.parse(message);
            this.aggregation_resource_list.push(triple_store);
            if (this.aggregation_resource_list.length == this.aggregation_resource_list_batch_size) {
                aggregation_publisher.publish(this.aggregation_resource_list);
                this.aggregation_resource_list = [];
            }
            if (this.aggregation_resource_list.length == 0) {
                this.logger.debug(`No aggregation events to publish.`);
            }
        });

        event_emitter.on('close', () => {
            this.logger.debug(`Closing the aggregation event publisher.`);
        });

        event_emitter.on('error', (error: any) => {
            this.logger.debug(`Error in aggregation event publisher: ${error}`);
        });

        event_emitter.on('end', () => {
            this.logger.debug(`End of aggregation event publisher.`);
        });
    }
}