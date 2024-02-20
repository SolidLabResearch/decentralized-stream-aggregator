import { Bindings } from "@comunica/types";
import { LDESinLDP, LDPCommunication, SolidCommunication } from "@treecg/versionawareldesinldp";
import { RateLimitedLDPCommunication } from "rate-limited-ldp-communication";
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

export type readOpts =  {
    from?: Date,
    to?: Date,
    ldes: LDESinLDP,
    communication: LDPCommunication | SolidCommunication | RateLimitedLDPCommunication,
    rate: number,
    interval: number
}