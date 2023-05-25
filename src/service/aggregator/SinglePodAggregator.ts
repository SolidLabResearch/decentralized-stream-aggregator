const WebSocketClient = require('websocket').client;
const websocketConnection = require('websocket').connection;
const { LDPCommunication, LDESinLDP } = require('@treecg/versionawareldesinldp');
const QueryEngine = require('@comunica/query-sparql').QueryEngine;
import { v4 as uuidv4 } from 'uuid';
const { Store } = require('n3');
import { RDFStream, RSPEngine } from "rsp-js";
import { Logger, ILogObj } from "tslog";
import { LDESPublisher } from "../publishing-stream-to-pod/LDESPublisher";

export class SinglePodAggregator {
    public LDESContainer: string;
    public streamName: RDFStream | undefined;
    public LDESCommunication: any;
    public queryEngine: any;
    public startTime: any;
    public endTime: any;
    public rspEngine: any;
    public ldesinldp: any;
    public serverURL: string;
    public aggregationEmitter: any;
    public client = new WebSocketClient();
    public connection: typeof websocketConnection;
    public observationCounter: number = 1;
    public logger: Logger<ILogObj>;
    public ldes_publisher: LDESPublisher;

    /**
     * Creates an instance of SinglePodAggregator.
     * @param {string} LDESContainer
     * @param {string} continuousQuery
     * @param {string} wssURL
     * @param {*} startDate
     * @param {*} endDate
     * @param {string} streamName
     * @memberof SinglePodAggregator
     */
    constructor(LDESContainer: string, continuousQuery: string, wssURL: string, startDate: any, endDate: any, streamName: string, latest_minutes: number) {
        this.LDESCommunication = new LDPCommunication();
        this.queryEngine = new QueryEngine();
        this.ldesinldp = new LDESinLDP(LDESContainer, this.LDESCommunication);
        this.LDESContainer = LDESContainer;
        this.rspEngine = new RSPEngine(continuousQuery);
        this.streamName = this.rspEngine.getStream(streamName);
        this.aggregationEmitter = this.rspEngine.register();
        this.startTime = startDate;
        this.endTime = endDate;
        this.serverURL = wssURL;
        this.connection = websocketConnection;
        this.logger = new Logger();
        if (this.streamName != undefined) {
            this.executeRSP(this.streamName).then((result: any) => {
                this.logger.info(`Getting Events From ${LDESContainer}`);
            });
        }
        else {
            this.logger.error(`The stream is undefined.`);
        }
        this.ldes_publisher = new LDESPublisher(latest_minutes);
        this.ldes_publisher.initialise();
    }
    /**
     * Processes the event sourced stream by getting the latest events from the 
     * Solid Pod and then adding them to the RDF Stream Processing Engine.
     *
     * @param {RDFStream} streamName
     * @memberof SinglePodAggregator
     */
    async executeRSP(streamName: RDFStream) {
        this.logger.info(`The stream name is ${streamName.name}`)
        this.connect_with_server(this.serverURL).then(r => {
            this.logger.info(`Connected to the server`)
        });
        this.client.on('connect', async (connection: typeof websocketConnection) => {
            this.logger.info(`WebSocket Client is connected.`);
            let LILStream = await this.ldesinldp.readAllMembers(new Date(this.startTime), new Date(this.endTime));
            LILStream.on('data', async (data: any) => {
                let LILStreamStore = new Store(data.quads);
                let bindingStream = await this.queryEngine.queryBindings(`
                PREFIX saref: <https://saref.etsi.org/core/>
                SELECT ?time WHERE {
                    ?s saref:hasTimestamp ?time .
                }
                `, {
                    sources: [LILStreamStore]
                });

                bindingStream.on('data', async (bindings: any) => {
                    let timestamp = await this.epoch(bindings.get('time').value);
                    this.logger.info(`The timestamp is ${timestamp}`);
                    if (streamName) {
                        this.logger.info(`Adding Event to ${streamName}`);
                        await this.addEventToRSPEngine(data, [streamName], timestamp);
                    }
                    else {
                        this.logger.error(`The stream is undefined`);
                    }
                });
            });
            this.aggregationEmitter.on('RStream', async (object: any) => {
                let window_timestamp_from = object.timestamp_from;
                let window_timestamp_to = object.timestamp_to;
                let iterable = object.bindings.values();
                for (let item of iterable) {
                    let aggregation_event_timestamp = new Date().getTime();
                    let data = item.value;
                    let aggregation_event: string = this.generateAggregationEvent(data, aggregation_event_timestamp, this.streamName?.name, window_timestamp_from, window_timestamp_to);
                    this.sendToServer(aggregation_event);
                }
            });
        });

    }

    /**
     * Sends the aggregated event to a HTTP server via a websocket connection.
     *
     * @param {string} message
     * @memberof SinglePodAggregator
     */
    sendToServer(message: string) {
        if (this.connection.connected) {
            this.connection.sendUTF(message);
        }
        else {
            this.logger.error(`The connection is not established`);
        }
    }

    /**
     * Adds the retrieved events from the Solid Pod to the RDF Stream Processing Engine.
     *
     * @param {*} data
     * @param {RDFStream[]} streamName
     * @param {number} timestamp
     * @memberof SinglePodAggregator
     */
    async addEventToRSPEngine(data: any, streamName: RDFStream[], timestamp: number) {
        streamName.forEach((stream: RDFStream) => {
            for (let i = 0; i < data.quads.length; i++) {
                stream.add(data.quads[i], timestamp);
            }
        });
    }
    /**
     * Annotates the received aggregated event from the RDF stream Processing Engine (the result of aggregation)
     * with the timestamp and the stream name and other metadata.
     * @param {*} value
     * @param {number} event_timestamp
     * @param {(string | undefined)} stream_name
     * @param {number} event_counter
     * @return {*}  {string}
     * @memberof SinglePodAggregator
     */
    generateAggregationEvent(value: any, event_timestamp: number, stream_name: string | undefined, timestamp_from: number, timestamp_to: number): string {
        if (stream_name == undefined) {
            stream_name = "https://rsp.js/undefined";
        }
        let uuid_random = uuidv4();
        const timestamp_date = new Date(event_timestamp).toISOString();
        const timestamp_from_date = new Date(timestamp_from).toISOString();
        const timestamp_to_date = new Date(timestamp_to).toISOString();
        let aggregation_event = `
        <https://rsp.js/aggregation_event/${uuid_random}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://saref.etsi.org/core/Measurement> .
        <https://rsp.js/aggregation_event/${uuid_random}> <https://saref.etsi.org/core/hasTimestamp> "${timestamp_date}"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
        <https://rsp.js/aggregation_event/${uuid_random}> <https://saref.etsi.org/core/hasValue> "${value}"^^<http://www.w3.org/2001/XMLSchema#float> .
        <https://rsp.js/aggregation_event/${uuid_random}> <http://www.w3.org/ns/prov#wasDerivedFrom> <https://argahsuknesib.github.io/asdo/AggregatorService> .
        <https://rsp.js/aggregation_event/${uuid_random}> <http://www.w3.org/ns/prov#generatedBy> <${stream_name}> .
        <https://rsp.js/aggregation_event/${uuid_random}> <http://w3id.org/rsp/vocals-sd#startedAt> "${timestamp_from_date}"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
        <https://rsp.js/aggregation_event/${uuid_random}> <http://w3id.org/rsp/vocals-sd#endedAt> "${timestamp_to_date}"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
        `;
        return aggregation_event;
    }

    /**
     * Connects to an HTTP server via a websocket connection.
     *
     * @param {string} wssURL
     * @memberof SinglePodAggregator
     */
    async connect_with_server(wssURL: string) {
        this.client.connect(wssURL, 'echo-protocol');
        this.client.on('connectFailed', (error: any) => {
            this.logger.error('Connect Error: ' + error.toString());
        });
        this.client.setMaxListeners(Infinity);
        this.client.on('connect', (connection: typeof websocketConnection) => {
            this.connection = connection;
        });
    }

    /**
     * Converts a date to an epoch timestamp.
     * @param {*} date
     * @return {*} 
     * @memberof SinglePodAggregator
     */
    async epoch(date: any) {
        return Date.parse(date);
    }
}
