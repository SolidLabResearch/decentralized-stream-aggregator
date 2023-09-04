import { QueryEngine } from "@comunica/query-sparql-link-traversal";
import { LDESinLDP, LDPCommunication } from "@treecg/versionawareldesinldp";
import { RDFStream, RSPEngine } from "rsp-js";
const { Store } = require('n3');
const ld_fetch = require('ldfetch');
const ldfetch = new ld_fetch({});
import WebSocket from 'ws';


export class LDESReader {
    public ldes_stream: string;
    public from_date: string;
    public to_date: string;
    public stream_name: RDFStream | undefined;
    public ldes: LDESinLDP;
    public comunica_engine: any;

    constructor(ldes_stream: string, from_date: string, to_date: string, rsp_engine: any) {
        this.ldes_stream = ldes_stream;
        this.ldes = new LDESinLDP(this.ldes_stream, new LDPCommunication());
        this.from_date = from_date;
        this.to_date = to_date;
        this.stream_name = rsp_engine.getStream(this.ldes_stream);
        this.comunica_engine = new QueryEngine();
        this.initiateLDESReader();
    }

    public async initiateLDESReader() {
        const stream = await this.ldes.readMembersSorted({
            from: new Date(this.from_date),
            until: new Date(this.to_date),
            chronological: true
        })
        if (this.stream_name !== undefined) {
            await this.subscribing_latest_events(this.stream_name);
        }
        stream.on("data", async (data: any) => {
            let stream_store = new Store(data.quads);
            if (this.stream_name !== undefined) {
                await this.add_event_store_to_rsp_engine(stream_store, [this.stream_name]);
            }
        });
    }

    async add_event_store_to_rsp_engine(store: any, stream_name: RDFStream[]) {
        const binding_stream = await this.comunica_engine.queryBindings(`
        PREFIX saref: <https://saref.etsi.org/core/>
        SELECT ?time WHERE {
            ?s saref:hasTimestamp ?time .
        }
        `, {
            sources: [store]
        });

        binding_stream.on('data', async (bindings: any) => {
            let timestamp = await this.epoch(bindings.get('time').value);
            console.log(`Timestamp: ${timestamp}`);
            if (stream_name) {
                console.log(`Adding Event to ${stream_name}`);
                await this.add_event_to_rsp_engine(store, stream_name, timestamp);
            }
            else {
                console.log(`The stream is undefined`);
            }
        });
    }

    async add_event_to_rsp_engine(store: any, stream_name: RDFStream[], timestamp: number) {
        stream_name.forEach((stream: RDFStream) => {
            let quads = store.getQuads(null, null, null, null);
            for (let quad of quads) {
                stream.add(quad, timestamp);
            }
        });
    }

    async epoch(date: any) {
        return Date.parse(date);
    }


    async subscribing_latest_events(stream_name: RDFStream) {
        let subscription_ws = await this.get_subscription_websocket_url(this.ldes_stream);
        console.log(`The subscription websocket url is ${subscription_ws}`);
        const websocket = new WebSocket(subscription_ws);
        websocket.onmessage = async (event: any) => {
            const parsed = JSON.parse(event.data);
            let resource_url = parsed.object;
            let resource = await ldfetch.get(resource_url);
            let resource_store = new Store(resource.triples);
            this.add_event_store_to_rsp_engine(resource_store, [stream_name]);
        };
    }

    async get_inbox_container(stream: string) {
        console.log(`Getting the inbox container from`, stream);
        let ldes_in_ldp = new LDESinLDP(stream, new LDPCommunication());
        let metadata = await ldes_in_ldp.readMetadata();
        for (const quad of metadata) {
            if (quad.predicate.value === 'http://www.w3.org/ns/ldp#inbox') {
                console.log(quad.object.value);
                if (quad.object.value != undefined) {
                    return quad.object.value;

                }
            }
        }
    }

    async get_subscription_websocket_url(ldes_stream: string): Promise<string> {
        let solid_server = ldes_stream.split("/").slice(0, 3).join("/");
        let inbox_container = await this.get_inbox_container(ldes_stream);
        let notification_server = solid_server + "/.notifications/WebSocketChannel2023/";
        let post_body = {
            "@context": ["https://www.w3.org/ns/solid/notification/v1"],
            "type": "http://www.w3.org/ns/solid/notifications#WebSocketChannel2023",
            "topic": `${inbox_container}`
        }
        const repsonse = await fetch(notification_server, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/ld+json',
                'Accept': 'application/ld+json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(post_body)
        })

        const response_json = await repsonse.json();
        return response_json.receiveFrom;
    }
}