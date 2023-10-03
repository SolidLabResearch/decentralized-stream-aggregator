import { QueryEngine } from "@comunica/query-sparql-link-traversal";
import { LDESinLDP, LDPCommunication } from "@treecg/versionawareldesinldp";
import { RDFStream, RSPEngine } from "rsp-js";
import { Bindings } from '@comunica/types';
import { quick_sort_queue, StreamEventQueue } from "../../utils/StreamEventQueue";
const { Store } = require('n3');
const ld_fetch = require('ldfetch');
const ldfetch = new ld_fetch({});
import { Quad } from "n3";
import WebSocket from 'ws';
import { QuadWithID, WebSocketMessage } from "../../utils/Types";

export class DecentralizedFileStreamer {
    public ldes_stream: string;
    public from_date: Date;
    public to_date: Date;
    public stream_name: RDFStream | undefined;
    public ldes: LDESinLDP;
    public comunica_engine: QueryEngine;
    public file_streamer_start_time: number = 0;
    public websocket_listening_time: number = 0;
    public missing_event_queue: StreamEventQueue<Set<Quad>>;

    constructor(ldes_stream: string, from_date: Date, to_date: Date, rsp_engine: RSPEngine) {
        this.ldes_stream = ldes_stream;
        this.ldes = new LDESinLDP(this.ldes_stream, new LDPCommunication());
        this.from_date = from_date;
        this.to_date = to_date;
        this.missing_event_queue = new StreamEventQueue<Set<Quad>>([]);
        this.stream_name = rsp_engine.getStream(this.ldes_stream);
        this.comunica_engine = new QueryEngine();
        this.initiateDecentralizedFileStreamer().then(() => {
            console.log(`Decentralized File Streamer initiated for ${this.ldes_stream}`);
            this.add_missing_events_to_rsp_engine();
        });
    }

    /**
     * Adding the events which might have been added between 
     * the start of the file streamer and the start of the websocket
     * to read the new events on the Solid Pod.
     * @memberof DecentralizedFileStreamer
     */
    public async add_missing_events_to_rsp_engine() {
        let start_time = this.get_file_streamer_start_time();
        let end_time = this.get_websocket_listening_time();
        const stream = await this.ldes.readMembersSorted({
            from: new Date(start_time),
            until: new Date(end_time),
            chronological: true
        });
        stream.on("data", async (data: QuadWithID) => {
            console.log(data);
            let stream_store = new Store(data.quads);
            const binding_stream = await this.comunica_engine.queryBindings(`
            PREFIX saref: <https://saref.etsi.org/core/>
            SELECT ?time WHERE {
                ?s saref:hasTimestamp ?time .
            }
            `, {
                sources: [stream_store]
            });

            binding_stream.on('data', async (bindings: Bindings) => {
                let time = bindings.get('time');
                if (time !== undefined) {
                    let timestamp = await this.epoch(time.value);
                    this.missing_event_queue.enqueue(stream_store.getQuads(), timestamp);
                }
            });
        });
    }

    public async initiateDecentralizedFileStreamer() {
        this.file_streamer_start_time = Date.now();
        const stream = await this.ldes.readMembersSorted({
            from: this.from_date,
            until: this.to_date,
            chronological: true
        })
        if (this.stream_name !== undefined) {
            await this.subscribing_latest_events(this.stream_name);
        }
        stream.on("data", async (data: QuadWithID) => {
            let stream_store = new Store(data.quads);
            if (this.stream_name !== undefined) {
                await this.add_event_store_to_rsp_engine(stream_store, [this.stream_name]);
            }
        });
    }

    async add_event_store_to_rsp_engine(store: typeof Store, stream_name: RDFStream[]) {
        const binding_stream = await this.comunica_engine.queryBindings(`
        PREFIX saref: <https://saref.etsi.org/core/>
        SELECT ?time WHERE {
            ?s saref:hasTimestamp ?time .
        }
        `, {
            sources: [store]
        });

        binding_stream.on('data', async (bindings: Bindings) => {
            let time = bindings.get('time');
            if (time !== undefined) {
                let timestamp = await this.epoch(time.value);
                console.log(`Timestamp: ${timestamp}`);
                if (stream_name) {
                    console.log(`Adding Event to ${stream_name}`);
                    await this.add_event_to_rsp_engine(store, stream_name, timestamp);
                }
                else {
                    console.log(`The stream is undefined`);
                }
            }
            else {
                console.log(`The time is undefined`);
            }
        });
    }

    async add_event_to_rsp_engine(store: typeof Store, stream_name: RDFStream[], timestamp: number) {
        stream_name.forEach((stream: RDFStream) => {
            let quads = store.getQuads(null, null, null, null);
            for (let quad of quads) {
                stream.add(quad, timestamp);
            }
        });
    }

    async epoch(date: string) {
        return Date.parse(date);
    }


    async subscribing_latest_events(stream_name: RDFStream) {
        let inbox = await this.get_inbox_container(this.ldes_stream);
        let stream_subscription_ws = await this.get_stream_subscription_websocket_url(this.ldes_stream);
        const stream_websocket = new WebSocket(stream_subscription_ws);
        stream_websocket.onmessage = async (event: any) => {
            this.websocket_listening_time = Date.now();
            const parsed = JSON.parse(event.data);
            inbox = parsed.object;
            if (inbox !== undefined) {
                let subscription_ws = await this.get_inbox_subscription_websocket_url(this.ldes_stream, inbox);
                const websocket = new WebSocket(subscription_ws);
                websocket.onmessage = async (event: any) => {
                    const parsed = JSON.parse(event.data);
                    let resource_url = parsed.object;
                    let resource = await ldfetch.get(resource_url);
                    let resource_store = new Store(resource.triples);

                    const binding_stream = await this.comunica_engine.queryBindings(`
                    PREFIX saref: <https://saref.etsi.org/core/>
                    SELECT ?time WHERE {
                        ?s saref:hasTimestamp ?time .
                    }
                    `, {
                        sources: [resource_store]
                    });

                    binding_stream.on('data', async (bindings: Bindings) => {
                        let time = bindings.get('time');
                        if (time !== undefined) {
                            let timestamp = await this.epoch(time.value);
                            this.missing_event_queue.enqueue(resource_store.getQuads(), timestamp);
                        }
                    });

                    let sorted_queue = quick_sort_queue(this.missing_event_queue);
                    this.add_event_store_to_rsp_engine(resource_store, [stream_name]);
                };
            }
        }

    }

    async get_inbox_container(stream: string) {
        console.log(`Getting the inbox container from`, stream);
        let ldes_in_ldp: LDESinLDP = new LDESinLDP(stream, new LDPCommunication());
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

    async get_stream_subscription_websocket_url(ldes_stream: string): Promise<string> {
        let solid_server = ldes_stream.split("/").slice(0, 3).join("/");
        let notification_server = solid_server + "/.notifications/WebSocketChannel2023/";
        let post_body = {
            "@context": ["https://www.w3.org/ns/solid/notification/v1"],
            "type": "http://www.w3.org/ns/solid/notifications#WebSocketChannel2023",
            "topic": `${ldes_stream}`
        }
        const repsonse = await fetch(notification_server, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/ld+json',
                'Accept': 'application/ld+json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(post_body)
        });
        const response_json = await repsonse.json();
        return response_json.receiveFrom;

    }

    async get_inbox_subscription_websocket_url(ldes_stream: string, inbox_container: string): Promise<string> {
        let solid_server = ldes_stream.split("/").slice(0, 3).join("/");
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

    get_websocket_listening_time() {
        return this.websocket_listening_time;
    }

    get_file_streamer_start_time() {
        return this.file_streamer_start_time;
    }

}