import { QueryEngine } from "@comunica/query-sparql-link-traversal";
import { LDESinLDP, LDPCommunication } from "@treecg/versionawareldesinldp";
import { RDFStream, RSPEngine } from "rsp-js";
const { Store } = require('n3');

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
}