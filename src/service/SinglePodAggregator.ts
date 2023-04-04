const WebSocketClient = require('websocket').client;
const websocketConnection = require('websocket').connection;
const { LDPCommunication, LDESinLDP, dateToLiteral } = require('@treecg/versionawareldesinldp');
const QueryEngine = require('@comunica/query-sparql').QueryEngine;
const { Store } = require('n3');
import { RDFStream, RSPEngine } from "rsp-js";
import { Logger, ILogObj } from "tslog";

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
        this.logger = new Logger();
        if (this.streamName != undefined) {
            this.executeRSP(this.streamName).then((result: any) => {
                this.logger.info(`Getting Events From ${LDESContainer}`);
            });
        }
        else {
            this.logger.error(`The stream is undefined.`);
        }
    }

    async executeRSP(streamName: RDFStream) {
        this.logger.info(`The stream name is ${streamName.name}`)
        this.connectWithServer(this.serverURL).then(r => {
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
            this.logger.error(`The connection is not established`);
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
            this.logger.error('Connect Error: ' + error.toString());
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
