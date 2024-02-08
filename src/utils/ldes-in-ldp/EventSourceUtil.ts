import {
    Communication,
    DCT,
    extractTimestampFromLiteral,
    ILDESinLDPMetadata,
    LDESinLDP,
    LDESMetadata,
    LDPCommunication,
    storeToString
} from "@treecg/versionawareldesinldp";
import { Literal, Quad, Store } from "n3";
import { DataFactory } from "rdf-data-factory";
const factory = new DataFactory();
// The semantics of Resource is the data point itself (!! not to be confused with an ldp:Resource)
export type Resource = Quad[]
// a dictionary which maps an ldp:containerURL to an array of Resources
export type BucketResources = { [p: string]: Resource[] }

/**
 * Calculates to which bucket (i.e. The ldp:Container) the resource should be added.
 * When the returned url is none, this means the resource its timestamp is less than all current bucket timestamps.
 * @param resource
 * @param metadata
 * @returns {string}
 */
export function calculateBucket(resource: Resource, metadata: ILDESinLDPMetadata): string {
    const relations = metadata.view.relations
    const resourceTs = getTimeStamp(resource, metadata.view.relations[0].path ?? DCT.created)

    let timestampJustSmaller = 0
    let correspondingUrl = "none";
    for (const relation of relations) {
        const relationTs: number = new Date(relation.value).getTime()
        if (relationTs <= resourceTs && timestampJustSmaller < relationTs) {
            timestampJustSmaller = relationTs
            correspondingUrl = relation.node
        }
    }
    return correspondingUrl;
}

/**
 * The new container URL is calculated based on the container URL where too many resources reside and a timestamp.
 * @param containerURL
 * @param timestamp
 */
export function createBucketUrl(containerURL: string, timestamp: number) {
    const split = containerURL.split('/')
    const bucket_url = `${split.slice(0, split.length - 1).join('/')}/${timestamp}/`;
    if (bucket_url.includes('http')) {
        return bucket_url
    } else {
        return "none";
    }
}

/**
 * Retrieve timestamp of a resource (ms).
 * @param resource
 * @param timestampPath
 * @returns {number}
 */
export function getTimeStamp(resource: Resource, timestampPath: string): number {
    const resourceStore = new Store(resource)
    return extractTimestampFromLiteral(resourceStore.getObjects(null, timestampPath, null)[0] as Literal)// Note: expecting real xsd:dateTime
}


/**
 * Adds all the resources from each bucket entry of the BucketResources object to the specified container
 * Note: currently does not do any error handling
 * handling should be something in the line of collecting all the resources that were added OR trying to add them again?
 * @param bucketResources
 * @param metadata
 * @param ldpComm
 * @returns {Promise<void>}
 */

/**
 *
 * @param bucket_resources
 * @param metadata
 * @param ldp_communication
 */
export async function add_resources_with_metadata_to_buckets(bucket_resources: BucketResources, metadata: ILDESinLDPMetadata, ldp_communication: LDPCommunication) {
    for (const containerURL of Object.keys(bucket_resources)) {
            for (const resource of bucket_resources[containerURL]) {
            const resourceStore = new Store(resource);
            if (containerURL.includes('http')) {
                const response = await ldp_communication.post(containerURL, storeToString(resourceStore));
                const uuid: string | null = response.headers.get('location');
                if (uuid !== null) {
                    const resource_subject = resourceStore.getSubjects(null, null, null)[0];
                    const relation_to_resource_store = new Store();
                    relation_to_resource_store.add(factory.quad(
                        factory.namedNode(resource_subject.value),
                        factory.namedNode('http://purl.org/dc/terms/source'),
                        factory.namedNode(uuid)
                    ));

                    ldp_communication.patch(
                        uuid,
                        `INSERT DATA {${storeToString(relation_to_resource_store)}}`
                    ).then((response) => {
                    }
                    ).catch((error) => {
                        console.log("Error while patching metadata of the LDP resource: " + error);
                    });
                }
            }
            else {
                console.log(containerURL);
            }

        }
    }
}

/**
 *
 * @param url
 * @param communication
 */
export async function create_ldp_container(url: string, communication: Communication) {
    if (url.endsWith('/')) {
        const response = await communication.put(url);
        if (response.status != 201) {
            console.error(`Could not create container at ${url} with status ${response.status}`);
        }
    }
    else {
        console.error(`The url ${url} does not end with a / and is therefore not a valid container url.`)
    }
}


/**
 *
 * @param ldes_in_ldp
 * @param bucket_url
 */
export async function check_if_container_exists(ldes_in_ldp: LDESinLDP, bucket_url: string) {
    const metadata = await ldes_in_ldp.readMetadata();
    for (const quad of metadata) {
        if (quad.predicate.value === 'http://www.w3.org/ns/ldp#contains') {
            if (quad.object.value === bucket_url) {
                return true;
            }
            else {
                return false;
            }
        }
    }
}

/**
 *
 * @param bucketResources
 * @param metadata
 * @param ldpComm
 */
export async function addResourcesToBuckets(bucketResources: BucketResources, metadata: ILDESinLDPMetadata, ldpComm: LDPCommunication) {
    for (const containerURL of Object.keys(bucketResources)) {
        for (const resource of bucketResources[containerURL]) {
            const response = await ldpComm.post(containerURL, storeToString(new Store(resource)));
            console.log(`Resource stored at: ${response.headers.get('location')} | status: ${response.status}`)
            // TODO: handle when status is not 201 (Http Created)
        }
    }
}
