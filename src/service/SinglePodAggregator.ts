const WebSocketClient = require('websocket').client;
const websocketConnection = require('websocket').connection;
const { LDPCommunication, LDESinLDP, dateToLiteral } = require('@treecg/versionawareldesinldp');
const QueryEngine = require('@comunica/query-sparql').QueryEngine;
const { Store } = require('n3');
import {RDFStream, RSPEngine} from "rsp-js";

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

    constructor(LDESContainer: string, continuousQuery: string, wssURL: string, startDate: any, endDate: any, streamName: string) {
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
        if (this.streamName != undefined) {
            this.executeRSP(this.streamName).then((result: any) => {
                console.log(`Getting Events From ${LDESContainer}`);
            });
        }
        else {
            console.log(`The stream is undefined`);
        }
    }

    async executeRSP(streamName: RDFStream) {
        console.log(`The stream name is ${streamName.name}`);
        this.connectWithServer(this.serverURL).then(r => {
            console.log(`Connected to the server`);
        });
        this.client.on('connect', async (connection: typeof websocketConnection) => {
            console.log('WebSocket Client Connected');
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
                    console.log(`The timestamp is ${timestamp}`);
                    if (streamName) {
                        console.log(`Adding Event to ${streamName}`);
                        await this.addEventToRSPEngine(data, [streamName], timestamp);
                    }
                    else {
                        console.log(`The stream is undefined`);
                    }
                });
            });
            this.aggregationEmitter.on('RStream', async (binding: any) => {
                let iterable = binding.values();
                for (let item of iterable) {
                    let AggregationEvent$Timestamp = new Date().getTime();
                    let data = item.value;
                    let AggregationEvent$: string = this.generateAggregationEvent(data, AggregationEvent$Timestamp, this.streamName?.name, this.observationCounter);
                    this.observationCounter++;
                    this.sendToServer(AggregationEvent$);
                }
            });
        });

    }

    sendToServer(message: string) {
        if (this.connection.connected) {
            this.connection.sendUTF(message);
        }
        else {
            console.log(`The connection is not established`);
        }
    }

    async addEventToRSPEngine(data: any, streamName: RDFStream[], timestamp: number) {
        streamName.forEach((stream: RDFStream) => {
            for (let i = 0; i < data.quads.length; i++) {
                stream.add(data.quads[i], timestamp);
            }
        });
    }

    generateAggregationEvent(value: any, eventTimestamp: number, streamName: string | undefined, eventCounter: number): string {
        if (streamName == undefined) {
            streamName = "https://rsp.js/undefined";
        }
        const timestampDate = new Date(eventTimestamp).toISOString();
        return `
        <https://rsp.js/AggregationEvent${eventCounter}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://saref.etsi.org/core/Measurement> .
        <https://rsp.js/AggregationEvent${eventCounter}> <https://saref.etsi.org/core/hasTimestamp> "${timestampDate}"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
        <https://rsp.js/AggregationEvent${eventCounter}> <https://saref.etsi.org/core/hasValue> "${value}"^^<http://www.w3.org/2001/XMLSchema#float> .
        <https://rsp.js/AggregationEvent${eventCounter}> <http://www.w3.org/ns/prov#wasDerivedFrom> <https://argahsuknesib.github.io/asdo/AggregatorService> .
        <https://rsp.js/AggregationEvent${eventCounter}> <http://www.w3.org/ns/prov#generatedBy> <${streamName}> .
        `;
    }

    async connectWithServer(wssURL: string) {
        this.client.connect(wssURL, 'echo-protocol');
        this.client.on('connectFailed', (error: any) => {
            console.log('Connect Error: ' + error.toString());
        });
        this.client.setMaxListeners(Infinity);
        this.client.on('connect', (connection: typeof websocketConnection) => {
            this.connection = connection;
        });
    }

    async epoch(date: any) {
        return Date.parse(date);
    }

}
