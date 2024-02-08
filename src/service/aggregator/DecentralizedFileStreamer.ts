import { QueryEngine } from "@comunica/query-sparql";
import { LDESinLDP, LDPCommunication, SolidCommunication, storeToString } from "@treecg/versionawareldesinldp";
import { RDFStream, RSPEngine } from "rsp-js";
import { Bindings } from '@comunica/types';
import { quick_sort_queue, StreamEventQueue } from "../../utils/StreamEventQueue";
const { Store } = require('n3');
const ld_fetch = require('ldfetch');
const ldfetch = new ld_fetch({});
const websocketConnection = require('websocket').connection;
const WebSocketClient = require('websocket').client;
import { Quad } from "n3";
import WebSocket from 'ws';
import { QuadWithID, WebSocketMessage } from "../../utils/Types";
import { session_with_credentials } from "../../utils/authentication/css-auth";
import { readMembersRateLimited } from "../../utils/ldes-in-ldp/EventSource";
import { RateLimitedLDPCommunication } from "rate-limited-ldp-communication";
import { hash_string_md5, insertion_sort, quick_sort } from "../../utils/Util";
import { TREE } from "@treecg/ldes-snapshot";

export class DecentralizedFileStreamer {
    public ldes_stream: string;
    public from_date: Date;
    public to_date: Date;
    static connection: typeof websocketConnection;
    public static client: any = new WebSocketClient();
    public stream_name: RDFStream | undefined;
    public ldes!: LDESinLDP;
    public comunica_engine: QueryEngine;
    public communication: Promise<SolidCommunication | LDPCommunication | RateLimitedLDPCommunication>;
    public session: any;
    public observation_array: any[];
    public query: string
    public query_hash: string;
    public file_streamer_start_time: number = 0;
    public logger: any
    public notification_listening_time: number = 0;
    public missing_event_queue: StreamEventQueue<Set<Quad>>;

    constructor(ldes_stream: string, session_credentials: session_credentials, from_date: Date, to_date: Date, rsp_engine: RSPEngine, query: string, logger: any) {
        this.ldes_stream = ldes_stream;
        this.communication = this.get_communication(session_credentials);
        this.from_date = from_date;
        this.to_date = to_date;
        this.query = query;
        this.logger = logger;
        this.query_hash = hash_string_md5(query);
        this.missing_event_queue = new StreamEventQueue<Set<Quad>>([]);
        this.stream_name = rsp_engine.getStream(this.ldes_stream);
        this.comunica_engine = new QueryEngine();
        this.observation_array = [];
        DecentralizedFileStreamer.connect_with_server('ws://localhost:8080/').then(() => {
            console.log(`The connection with the websocket server was established.`);
        });
        this.initiateDecentralizedFileStreamer().then(() => {
            this.add_missing_events_to_rsp_engine();
        });
    }

    public async get_communication(credentials: session_credentials) {
        const session = await this.get_session(credentials);
        if (session) {
            return new SolidCommunication(session);
        }
        else {
            return new LDPCommunication();
        }
    }

    /**
     * Adding the events which might have been added between 
     * the start of the file streamer and the start of the websocket
     * to read the new events on the Solid Pod.
     * @memberof DecentralizedFileStreamer
     */
    public async add_missing_events_to_rsp_engine() {
        const start_time = this.get_file_streamer_start_time();
        const end_time = this.get_websocket_listening_time();
        const stream = await readMembersRateLimited({
            ldes: this.ldes,
            rate: 60,
            communication: await this.communication,
            interval: 1000
        })
        stream.on("data", async (data: QuadWithID) => {
            const stream_store = new Store(data.quads);
            const binding_stream = await this.comunica_engine.queryBindings(`
            PREFIX saref: <https://saref.etsi.org/core/>
            SELECT ?time WHERE {
                ?s saref:hasTimestamp ?time .
            }
            `, {
                sources: [stream_store]
            });

            binding_stream.on('data', async (bindings: Bindings) => {
                const time = bindings.get('time');
                if (time !== undefined) {
                    const timestamp = await this.epoch(time.value);
                    this.missing_event_queue.enqueue(stream_store.getQuads(), timestamp);
                }
            });
        });

        stream.on("end", async () => {
            console.log(`The missing event stream has ended.`);
        });

    }

    public async initiateDecentralizedFileStreamer(): Promise<void> {
        const communication = await this.communication;
        this.ldes = new LDESinLDP(this.ldes_stream, communication);
        const metadata = await this.ldes.readMetadata();
        const bucket_strategy = metadata.getQuads(this.ldes_stream + "#BucketizeStrategy", TREE.path, null, null)[0].object.value;
        this.file_streamer_start_time = Date.now();
        this.logger.info({ query_id: this.query_hash }, `file_streamer_started for ${this.ldes_stream}`)
        const stream = await this.ldes.readMembersSorted({
            from: this.from_date,
            until: this.to_date,
            chronological: true
        });
        this.logger.info({ query_id: this.query_hash }, `file_streamer_ended for ${this.ldes_stream}`)
        if (this.stream_name !== undefined) {
            await this.subscribing_latest_events(this.stream_name);
        }
        stream.on("data", async (data: QuadWithID) => {
            const member_store = new Store(data.quads);
            const timestamp = member_store.getQuads(null, bucket_strategy, null, null)[0].object.value;
            const timestamp_epoch = Date.parse(timestamp);
            if (this.stream_name){
                this.logger.info({ query_id: this.query_hash }, `event_added_to_rsp_engine for ${this.ldes_stream}`)
                await this.add_event_to_rsp_engine(member_store, [this.stream_name], timestamp_epoch);
            }
        });

        stream.on("end", async () => {
            this.logger.info({ query_id: this.query_hash }, `stream events have been fully read and added to the RSP Engine.`);
            console.log(`The stream has been fully read and added to the .`);
            DecentralizedFileStreamer.sendToServer(`{
                "query_hash": "${this.query_hash}",
                "stream_name": "${this.stream_name}",
                "status": "stream_reader_ended"
            }`);
        });

        stream.on("error", async (error: Error) => {
            console.log(`The reading from the solid pod ldes stream has an error: ${error}`);
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
            const time = bindings.get('time');
            if (time !== undefined) {
                const timestamp = await this.epoch(time.value);
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
            const quads = store.getQuads(null, null, null, null);
            for (const quad of quads) {
                stream.add(quad, timestamp);
            }
        });
    }

    async epoch(date: string) {
        return Date.parse(date);
    }


    async subscribing_latest_events(stream_name: RDFStream) {
        const inbox = await this.get_inbox_container(this.ldes_stream);

        // let stream_subscription_ws = await this.get_stream_subscription_websocket_url(this.ldes_stream);
        // const stream_websocket = new WebSocket(stream_subscription_ws);
        // stream_websocket.onmessage = async (event: any) => {
        //     this.notification_listening_time = Date.now();
        //     const parsed = JSON.parse(event.data);
        //     inbox = parsed.object;
        //     if (inbox !== undefined) {
        //         let subscription_ws = await this.get_inbox_subscription_websocket_url(this.ldes_stream, inbox);
        //         const websocket = new WebSocket(subscription_ws);
        //         websocket.onmessage = async (event: any) => {
        //             const parsed = JSON.parse(event.data);
        //             let resource_url = parsed.object;
        //             let resource = await ldfetch.get(resource_url);
        //             let resource_store = new Store(resource.triples);
        //             const binding_stream = await this.comunica_engine.queryBindings(`
        //             PREFIX saref: <https://saref.etsi.org/core/>
        //             SELECT ?time WHERE {
        //                 ?s saref:hasTimestamp ?time .
        //             }
        //             `, {
        //                 sources: [resource_store]
        //             });

        //             binding_stream.on('data', async (bindings: Bindings) => {
        //                 let time = bindings.get('time');
        //                 if (time !== undefined) {
        //                     let timestamp = await this.epoch(time.value);
        //                     this.missing_event_queue.enqueue(resource_store.getQuads(), timestamp);
        //                 }
        //             });

        //             let sorted_queue = quick_sort_queue(this.missing_event_queue);
        //             this.add_event_store_to_rsp_engine(resource_store, [stream_name]);
        //         };
        //     }
        // }

    }

    async get_inbox_container(stream: string) {
        console.log(`Getting the inbox container from`, stream);
        const ldes_in_ldp: LDESinLDP = new LDESinLDP(stream, new LDPCommunication());
        const metadata = await ldes_in_ldp.readMetadata();
        for (const quad of metadata) {
            if (quad.predicate.value === 'http://www.w3.org/ns/ldp#inbox') {
                console.log(quad.object.value);
                if (quad.object.value != undefined) {
                    return quad.object.value;
                }
            }
        }
    }

    async subscribe_webhook_notification(ldes_stream: string): Promise<void> {
        const solid_server = ldes_stream.split("/").slice(0, 3).join("/");
        const webhook_notification_server = solid_server + "/.notifications/WebhookChannel2023/";
        const post_body = {
            "@context": [],
            "type": "http://www.w3.org/ns/solid/notifications#WebhookChannel2023",
            "topic": `${ldes_stream}`,
            "sendTo": "http://localhost:8080/"
        };

        const response = await fetch(webhook_notification_server, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/ld+json',
                'Accept': 'application/ld+json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(post_body)
        });
        const response_json = await response.json();
        console.log(response_json.sendTo);
    }

    async get_stream_subscription_websocket_url(ldes_stream: string): Promise<string> {
        const solid_server = ldes_stream.split("/").slice(0, 3).join("/");
        const notification_server = solid_server + "/.notifications/WebSocketChannel2023/";
        const post_body = {
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

    async add_sorted_queue_to_rsp_engine(sorted_queue: StreamEventQueue<Set<Quad>>) {
        for (let i = 0; i < sorted_queue.size(); i++) {
            const element = sorted_queue.dequeue();
            console.log(element);
        }
    }

    async get_inbox_subscription_websocket_url(ldes_stream: string, inbox_container: string): Promise<string> {
        const solid_server = ldes_stream.split("/").slice(0, 3).join("/");
        const notification_server = solid_server + "/.notifications/WebSocketChannel2023/";
        const post_body = {
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
        return this.notification_listening_time;
    }

    get_file_streamer_start_time() {
        return this.file_streamer_start_time;
    }

    async get_session(credentials: session_credentials) {
        return await session_with_credentials(credentials);
    }

    static sendToServer(message: string) {
        if (this.connection.connected) {
            this.connection.sendUTF(message);
        }
        else {
            this.connect_with_server('ws://localhost:8080/').then(() => {
                console.log(`The connection with the websocket server was not established. It is now established.`);
            });
        }
    }

    static async connect_with_server(wssURL: string) {
        this.client.connect(wssURL, 'solid-stream-aggregator-protocol');
        this.client.on('connect', (connection: typeof websocketConnection) => {
            DecentralizedFileStreamer.connection = connection;
        });
        this.client.setMaxListeners(Infinity);
        this.client.on('connectFailed', (error: Error) => {
            console.log('Connect Error: ' + error.toString());
        });
    }

}

type session_credentials = {
    id: string;
    secret: string;
    idp: string;
}