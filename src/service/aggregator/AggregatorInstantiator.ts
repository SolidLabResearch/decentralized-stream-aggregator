import { RSPEngine } from "rsp-js";
import { RSPQLParser } from "../parsers/RSPQLParser";
import { LDESReader } from "./LDESReader";
const parser = new RSPQLParser();
export class AggregatorInstantiator {
    public query: string;
    public rsp_engine: RSPEngine;
    public rsp_emitter: any;
    public websocket_server: any;
    public from_date: Date;
    public stream_array: string[];
    public to_date: Date;
    public constructor(query: string, from_timestamp: number, to_timestamp: number) {
        this.query = query;
        this.rsp_engine = new RSPEngine(query);
        this.from_date = new Date(from_timestamp);
        this.to_date = new Date(to_timestamp);
        this.stream_array = [];
        parser.parse(this.query).s2r.forEach((stream) => {
            this.stream_array.push(stream.stream_name);
        });
        this.rsp_emitter = this.rsp_engine.register();
        this.intiateLDESReader();        
    }

    public async intiateLDESReader() {
        for (const stream of this.stream_array) {
            new LDESReader(stream, "2022-11-07T09:27:17.5890", "2024-11-07T09:27:17.5890", this.rsp_engine)
            this.rsp_emitter.on('RStream', async(object: any) => {
                console.log(object);
                
            })
            // new LDESReader(stream, this.from_date, this.to_date, this.rsp_engine);
        }
    }

}