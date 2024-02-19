import { RSPEngine } from "rsp-js";
import { RSPQLParser } from "../parsers/RSPQLParser";
import { DecentralizedFileStreamer } from "./DecentralizedFileStreamer";
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from "events";
import * as CREDENTIALS from '../../config/PodToken.json';
import { BindingsWithTimestamp } from "../../utils/Types";
import { hash_string_md5 } from "../../utils/Util";
const WebSocketClient = require('websocket').client;
const websocketConnection = require('websocket').connection;
const parser = new RSPQLParser();

export class AggregatorInstantiator {
    public query: string;
    public rsp_engine: RSPEngine;
    public rsp_emitter: EventEmitter;
    public from_date: Date;
    public stream_array: string[];
    public hash_string: string;
    public logger: any;
    public to_date: Date;
    public client = new WebSocketClient();
    public connection: typeof websocketConnection;
    public constructor(query: string, from_timestamp: number, to_timestamp: number, logger: any) {
        this.query = query;
        this.logger = logger;
        this.hash_string = hash_string_md5(query);
        this.rsp_engine = new RSPEngine(query);
        this.from_date = new Date(from_timestamp);
        this.to_date = new Date(to_timestamp);
        this.stream_array = [];
        this.connection = websocketConnection;
        parser.parse(this.query).s2r.forEach((stream) => {
            this.stream_array.push(stream.stream_name);
        });
        this.rsp_emitter = this.rsp_engine.register();
        this.intiateDecentralizedFileStreamer();
    }
    public async intiateDecentralizedFileStreamer() {
        const query_hashed = hash_string_md5(this.query);
        console.log(`Initiating LDES Reader for ${this.stream_array}`);
        for (const stream of this.stream_array) {
            const session_credentials = this.get_session_credentials(stream);
            this.logger.info({ query_hashed }, `stream_credentials_retrieved`);
            new DecentralizedFileStreamer(stream, session_credentials, this.from_date, this.to_date, this.rsp_engine, this.query, this.logger);
        }
        this.executeRSP();
    }

    public async executeRSP() {
        // RSP Engine event emitter.
        this.connect_with_server('ws://localhost:8080/').then(() => {
            console.log(`The connection with the websocket server has been established.`);
            this.connection.connected = true;
        });
        this.client.on('connect', (connection: typeof websocketConnection) => {
            console.log(`The connection with the server has been established. ${connection.connected}`);
            this.rsp_emitter.on('RStream', async (object: BindingsWithTimestamp) => {
                const window_timestamp_from = object.timestamp_from;
                const window_timestamp_to = object.timestamp_to;
                const iterable = object.bindings.values();
                console.log(object.bindings.size);
                for (const item of iterable) {
                    const aggregation_event_timestamp = new Date().getTime();
                    const data = item.value;
                    const aggregation_object: aggregation_object = {
                        query_hash: this.hash_string,
                        aggregation_event: this.generate_aggregation_event(data, aggregation_event_timestamp, this.stream_array, window_timestamp_from, window_timestamp_to),
                        aggregation_window_from: this.from_date,
                        aggregation_window_to: this.to_date,
                    };
                    const aggregation_object_string = JSON.stringify(aggregation_object);
                    this.sendToServer(aggregation_object_string);
                }

            })
        });
    }

    // TODO : add extra projection variables to the aggregation event.
    generate_aggregation_event(value: string, event_timestamp: number, stream_array: string[] | undefined, timestamp_from: number, timestamp_to: number): string {
        if (stream_array === undefined) {
            throw new Error("The stream array is undefined. ");
        }
        else {
            const timestamp_date = new Date(event_timestamp).toISOString();
            const timestamp_from_date = new Date(timestamp_from).toISOString();
            const timestamp_to_date = new Date(timestamp_to).toISOString();
            const uuid_random = uuidv4();
            let aggregation_event = `
        <https://rsp.js/aggregation_event/${uuid_random}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://saref.etsi.org/core/Measurement> .
        <https://rsp.js/aggregation_event/${uuid_random}> <https://saref.etsi.org/core/hasTimestamp> "${timestamp_date}"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
        <https://rsp.js/aggregation_event/${uuid_random}> <https://saref.etsi.org/core/hasValue> "${value}"^^<http://www.w3.org/2001/XMLSchema#float> .
        <https://rsp.js/aggregation_event/${uuid_random}> <http://www.w3.org/ns/prov#wasDerivedFrom> <https://argahsuknesib.github.io/asdo/AggregatorService> .
        <https://rsp.js/aggregation_event/${uuid_random}> <http://w3id.org/rsp/vocals-sd#startedAt> "${timestamp_from_date}"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
        <https://rsp.js/aggregation_event/${uuid_random}> <http://w3id.org/rsp/vocals-sd#endedAt> "${timestamp_to_date}"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
        `;
            for (const stream of stream_array) {
                aggregation_event += `<https://rsp.js/aggregation_event/${uuid_random}> <http://www.w3.org/ns/prov#generatedBy> <${stream}> .`
            }
            return aggregation_event;
        }
    }


    async connect_with_server(wssURL: string) {
        this.client.connect(wssURL, 'solid-stream-aggregator-protocol');
        this.client.on('connectFailed', (error: Error) => {
            console.log('Connect Error: ' + error.toString());
        });
        this.client.setMaxListeners(Infinity);
        this.client.on('connect', (connection: typeof websocketConnection) => {
            this.connection = connection;
        });
    }

    sendToServer(message: string) {
        if (this.connection.connected) {
            this.connection.sendUTF(message);
        }
        else {
            this.connect_with_server('ws://localhost:8080/').then(() => {
                console.log(`The connection with the websocket server was not established. It is now established.`);
            });
        }
    }

    get_session_credentials(stream_name: string) {
        const credentials: Credentials = CREDENTIALS;
        const session_credentials = credentials[stream_name];
        return session_credentials;
    }

}

export type aggregation_object = {
    query_hash: string,
    aggregation_event: string,
    aggregation_window_from: Date,
    aggregation_window_to: Date
}

export type Credentials = {
    [key: string]: {
        id: string;
        secret: string;
        idp: string;
    };
};
