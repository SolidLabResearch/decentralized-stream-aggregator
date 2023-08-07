const WebSocketClient = require('websocket').client;
const websocketConnection = require('websocket').connection;
const { LDPCommunication, LDESinLDP, login, isLoggedin, getSession } = require('@treecg/versionawareldesinldp');
const QueryEngine = require('@comunica/query-sparql').QueryEngine;
import { v4 as uuidv4 } from 'uuid';
const { Store } = require('n3');
import { Session } from "@inrupt/solid-client-authn-node";
import { RDFStream, RSPEngine } from "rsp-js";
import { Logger, ILogObj } from "tslog";
import { LDESPublisher } from "../publishing-stream-to-pod/LDESPublisher";
import { SolidCommunication } from '@treecg/versionawareldesinldp';

export type aggregation_object = {
    aggregation_event: string,
    aggregation_window_from: Date,
    aggregation_window_to: Date
}

export class SinglePodAggregator {
    public ldes_container: string;
    public stream_name: RDFStream | undefined;
    public ldp_communication: any;
    public comunica_engine: any;
    public start_time: any;
    public end_time: any;
    public rsp_engine: any;
    public ldesinldp: any;
    public aggregation_server: string;
    public rsp_aggregation_emitter: any;
    public client = new WebSocketClient();
    public connection: typeof websocketConnection;
    public observationCounter: number = 1;
    public logger: Logger<ILogObj>;
    public ldes_publisher: LDESPublisher;

    /**
     * Creates an instance of SinglePodAggregator.
     * @param {string} ldes_container
     * @param {string} query
     * @param {string} wssURL
     * @param {*} startDate
     * @param {*} endDate
     * @param {string} stream_name
     * @memberof SinglePodAggregator
     */
    constructor(ldes_container: string, query: string, wssURL: string, start_time: any, end_time: any, latest_minutes: number, session: Session) {
        // this.ldp_communication = new SolidCommunication(session);
        this.ldp_communication = new LDPCommunication();
        this.comunica_engine = new QueryEngine();
        this.ldesinldp = new LDESinLDP(ldes_container, this.ldp_communication);
        this.ldes_container = ldes_container;
        this.rsp_engine = new RSPEngine(query);
        this.rsp_aggregation_emitter = this.rsp_engine.register();
        this.start_time = start_time;
        this.end_time = end_time;
        this.aggregation_server = wssURL;
        this.connection = websocketConnection;
        this.logger = new Logger();
        this.stream_name = this.rsp_engine.getStream(this.ldes_container);
        if (this.stream_name != undefined) {
            this.executeRSP(this.stream_name).then(() => {
                this.logger.info(`Getting Events From ${ldes_container}`);
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
     * @param {RDFStream} stream_name
     * @memberof SinglePodAggregator
     */
    async executeRSP(stream_name: RDFStream) {
        this.logger.info(`The stream name is ${stream_name.name}`)
        this.connect_with_server(this.aggregation_server).then(r => {
            this.logger.info(`Connected to the server`)
        });
        this.client.on('connect', async (connection: typeof websocketConnection) => {
            this.logger.info(`WebSocket Client is connected.`);
            let LILStream = await this.ldesinldp.readMembersSorted({
                from: new Date(this.start_time),
                to: new Date(this.end_time),
                chronological: true
            });
            LILStream.on('data', async (data: any) => {
                let LILStreamStore = new Store(data.quads);
                let binding_stream = await this.comunica_engine.queryBindings(`
                PREFIX saref: <https://saref.etsi.org/core/>
                SELECT ?time WHERE {
                    ?s saref:hasTimestamp ?time .
                }
                `, {
                    sources: [LILStreamStore]
                });

                binding_stream.on('data', async (bindings: any) => {
                    let timestamp = await this.epoch(bindings.get('time').value);
                    this.logger.info(`The timestamp is ${timestamp}`);
                    if (stream_name) {
                        this.logger.info(`Adding Event to ${stream_name}`);
                        await this.add_event_to_rsp_engine(data, [stream_name], timestamp);
                    }
                    else {
                        this.logger.error(`The stream is undefined`);
                    }
                });
            });
            this.rsp_aggregation_emitter.on('RStream', async (object: any) => {
                let window_timestamp_from = object.timestamp_from;
                let window_timestamp_to = object.timestamp_to;
                let iterable = object.bindings.values();
                for (let item of iterable) {
                    let aggregation_event_timestamp = new Date().getTime();
                    let data = item.value;
                    let aggregation_object: aggregation_object = {
                        aggregation_event: this.generate_aggregation_event(data, aggregation_event_timestamp, this.stream_name?.name, window_timestamp_from, window_timestamp_to),
                        aggregation_window_from: this.start_time,
                        aggregation_window_to: this.end_time
                    }
                    let aggregation_object_string = JSON.stringify(aggregation_object);
                    this.sendToServer(aggregation_object_string);
                }
            });
        });

    }

    /**
     * Sends the aggregated event to a HTTP server via a websocket connection.
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
     * @param {RDFStream[]} stream_name
     * @param {number} timestamp
     * @memberof SinglePodAggregator
     */
    async add_event_to_rsp_engine(data: any, stream_name: RDFStream[], timestamp: number) {
        stream_name.forEach((stream: RDFStream) => {
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
    generate_aggregation_event(value: any, event_timestamp: number, stream_name: string | undefined, timestamp_from: number, timestamp_to: number): string {
        if (stream_name == undefined) {
            stream_name = "https://rsp.js/undefined";
        }
        const timestamp_date = new Date(event_timestamp).toISOString();
        const timestamp_from_date = new Date(timestamp_from).toISOString();
        const timestamp_to_date = new Date(timestamp_to).toISOString();
        let uuid_random = uuidv4();
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