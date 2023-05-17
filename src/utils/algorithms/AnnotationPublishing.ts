import { createContainer, extractLdesMetadata, LDESConfig, LDESinLDP, LDPCommunication, storeToString } from "@treecg/versionawareldesinldp";
import { Session } from "@rubensworks/solid-client-authn-isomorphic";
import { Resource, calculateBucket } from "../ldes-in-ldp/EventSourceUtil";
import N3 from 'n3';
import { getTimeStamp } from "../ldes-in-ldp/EventSource";
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;

export async function publish_with_metadata(query: string, ldes_in_ldp: LDESinLDP, event_resources: Resource[], version_id: string, bucket_size_per_container: number, config: LDESConfig, session?: Session) {
    const metadata_store = await ldes_in_ldp.readMetadata();
    const metadata = extractLdesMetadata(metadata_store, ldes_in_ldp.LDESinLDPIdentifier + "#EventStream");
    const query_metadata_store: N3.Store = get_query_metadata(query);
    for (const resource of event_resources) {
        const resource_metadata_store: N3.Store = get_ldp_resource_metadata(resource);
    }
    const bucketResources: {
        [key: string]: Resource[]
    } = {};
    for (const relation of metadata.views[0].relations) {
        bucketResources[relation.node] = [];
    }
    bucketResources["none"] = [];
    let earliest_resource_timestamp: number = Infinity;

    if (event_resources.length > bucket_size_per_container) {
        let bucket_resources = event_resources.slice(0, bucket_size_per_container);
        for (const resource of bucket_resources) {
            const bucket = calculateBucket(resource, metadata);
            bucketResources[bucket].push(resource);
            const resource_timestamp = getTimeStamp(resource, metadata.timestampPath);
            if (earliest_resource_timestamp > resource_timestamp) {
                earliest_resource_timestamp = resource_timestamp;
            }
            const resource_store = new N3.Store(resource);
            const subject = resource_store.getSubjects(metadata.timestampPath, null, null)[0];
            resource_store.addQuad(
                subject,
                namedNode(metadata.versionOfPath),
                namedNode(version_id),
            )
        }
        if (bucketResources["none"].length !== 0){
            bucketResources["none"].forEach(resource => {
                const resource_timestamp = getTimeStamp(resource, metadata.timestampPath);
                if (earliest_resource_timestamp > resource_timestamp) {
                    earliest_resource_timestamp = resource_timestamp;
                }
                const resource_store = new N3.Store(resource);
                const subject = resource_store.getSubjects(metadata.timestampPath, null, null)[0];
                resource_store.addQuad(
                    subject,
                    namedNode(metadata.versionOfPath),
                    namedNode(version_id),
                )
            })
        }
    }

    for (const resource of event_resources) {
        const bucket = calculateBucket(resource, metadata);
        bucketResources[bucket].push(resource);

        const resource_timestamp = getTimeStamp(resource, metadata.timestampPath);
        if (earliest_resource_timestamp > resource_timestamp) {
            earliest_resource_timestamp = resource_timestamp;
        }

        const resource_store = new N3.Store(resource);
        const subject = resource_store.getSubjects(metadata.timestampPath, null, null)[0];
        resource_store.addQuad(
            subject,
            namedNode(metadata.versionOfPath),
            namedNode(version_id),
        )
    }
    const new_container_url = ldes_in_ldp.LDESinLDPIdentifier + earliest_resource_timestamp + "/";
    createContainer(new_container_url, ldes_in_ldp.communication);
    patch_metadata(get_query_metadata(query), new_container_url)
}

export function get_query_metadata(query: string): N3.Store {
    const store = new N3.Store();
    store.addQuad(
        namedNode("https://argahsuknesib.github.io/asdo/AggregationFunction"),
        namedNode("https://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("https://fno.io/spec/#fn-function"),
        defaultGraph()
    )
    return store;
}

export function get_ldp_resource_metadata(resource: Resource): N3.Store {
    const store = new N3.Store();
    store.addQuad(
        namedNode("https://rsp.js/AggregationEvent/"),
        namedNode("https://argahsuknesib.github.io/asdo/generatedFrom"),
        literal(1658978924),
        defaultGraph()
    )
    store.addQuad(
        namedNode("https://rsp.js/AggregationEvent/"),
        namedNode("https://argahsuknesib.github.io/asdo/generatedTo"),
        literal(1658977888),
        defaultGraph()
    )
    return store;
}

export function patch_metadata(content: N3.Store, location: string): void {
    fetch(location + '.meta', {
        method: 'PATCH',
        headers: {
            'Content-type': 'text/turtle'
        },
        body: storeToString(content)
    })
}

export function post(content: N3.Store, location: string): void {
    fetch(location, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/turtle',
        },
        body: storeToString(content)
    })
}

export function post_resource_in_containers(resources: Resource[], ldp_communication: LDPCommunication) {

}