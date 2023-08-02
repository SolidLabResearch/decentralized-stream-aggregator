import { LDESinLDP, LDPCommunication } from "@treecg/versionawareldesinldp";

const N3 = require('n3');
const writer = new N3.Writer()
const ld_fetch = require('ldfetch');
const fetch = new ld_fetch({});
const QueryEngine = require('@comunica/query-sparql').QueryEngine;
const myEngine = new QueryEngine();


export async function get_metadata_container(resource: string) {
    let ldp_container_meta = resource.split("/").slice(0, -1).join("/") + "/.meta";
    let metadata = await fetch.get(ldp_container_meta);
    const store = new N3.Store();
    for (let quad of metadata.triples) {
        if (quad.predicate.value !== "http://www.w3.org/ns/ldp#contains") {
            store.addQuad(quad);
        }
    }
    const quads = store.getQuads(null, null, null, null);
    console.log(writer.quadsToString(quads))
}

export async function trace_original_events(resource: string) {
    let stream = await get_container_stream_metadata(resource).then((stream: string) => {
        let resource_metadata = fetch.get(resource).catch((error: any) => {
            console.log(error);
        }).then(async (resource_metadata: any) => {
            const store = await new N3.Store(await resource_metadata.triples);
            const binding_stream = await myEngine.queryBindings(`
                select ?timestamp_to ?timestamp_from where {
                    ?s <http://w3id.org/rsp/vocals-sd#endedAt> ?timestamp_to .
                    ?s <http://w3id.org/rsp/vocals-sd#startedAt> ?timestamp_from .
                }
            `, {
                sources: [store]
            });
            binding_stream.on('data', async (binding: any) => {
                await get_original_events(stream, binding.get('timestamp_from').value, binding.get('timestamp_to').value);
            });
        });
    });
}

async function get_original_events(registered_stream: string, aggregation_event_window_start: Date, aggregation_event_window_end: Date) {
    const communication = new LDPCommunication();
    const ldes_in_ldp = new LDESinLDP(registered_stream, communication);
    let aggregation_event_window_start_date = new Date(aggregation_event_window_start);
    let aggregation_event_window_end_date = new Date(aggregation_event_window_end);
    const lil_stream = ldes_in_ldp.readAllMembers(aggregation_event_window_start_date, aggregation_event_window_end_date);
    (await lil_stream).on('data', (member: any) => {
        console.log(member.quads[0].subject.value);
    });
}

async function get_container_stream_metadata(ldp_resource: string) {
    let ldp_container_meta: string = ldp_resource.split("/").slice(0, -1).join("/") + "/.meta";
    let metadata = await fetch.get(ldp_container_meta).catch((error: any) => {
        console.log(error);
    });
    if (metadata !== undefined) {
        const store = new N3.Store(await metadata.triples);
        for (const quad of store) {
            if (quad.predicate.value === "http://w3id.org/rsp/vocals-sd#registeredStreams") {
                return quad.object.value;
            }
            else {
            }
        }
    }
    else {
    }
}