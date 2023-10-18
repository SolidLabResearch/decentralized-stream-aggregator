import { Bindings } from "@comunica/types";
import { Quad } from "rdflib/lib/tf-types";

export type QuadWithID = {
    id: string;
    quads: Quad[];
}

export type RequestBody = {
    query: string;
    latest_minutes: number;
    query_type: string;
}

export type AggregatorServerOptions = {
    port: number;
    solid_server_url: string;
}

export type BindingsWithTimestamp = {
    bindings: Bindings,
    timestamp_from: number,
    timestamp_to: number
}

export type WebSocketMessage = {
    type: string,
    data: unknown
}

export type Prefixes = { [key: string]: string }
