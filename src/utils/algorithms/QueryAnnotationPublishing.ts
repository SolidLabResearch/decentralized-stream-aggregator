import { addResourcesToBuckets, calculateBucket, getTimeStamp, Resource } from "../ldes-in-ldp/EventSourceUtil";
import { LDESConfig, SolidCommunication, LDPCommunication, LDESinLDP, extractLdesMetadata, createContainer } from "@treecg/versionawareldesinldp";
import { Session } from "@rubensworks/solid-client-authn-isomorphic";
import { Logger, ILogObj } from "tslog";
import { RSPQLParser } from "../../service/parsers/RSPQLParser";
import { DataFactory, Store } from "n3";
const { quad, namedNode } = DataFactory;

export class QueryAnnotationPublishing {

    private logger: Logger<ILogObj>;
    public parser: RSPQLParser;
    public bucket_resources: {
        [key: string]: Resource[]
    }

    constructor() {
        this.logger = new Logger();
        this.parser = new RSPQLParser();
        this.bucket_resources = {};
        
    }

    public async publish(query: string, ldes_in_ldp_url: string, event_resources: Resource[], version_id: string, bucket_size_per_container: number, config: LDESConfig, session?: Session): Promise<void> {
        // initialise an LDES if it is not initialised already.
        const communication = session ? new SolidCommunication(session) : new LDPCommunication();
        const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_url, communication);
        await ldes_in_ldp.initialise(config);
        // calculate the correct bucket for each resource
        const metadata_store = await ldes_in_ldp.readMetadata();
        const metadata = extractLdesMetadata(metadata_store, ldes_in_ldp_url + "#EventStream");
        // get the metadata related to the query to be added to the .meta file of the container
        const query_metadata_store: Store = this.get_query_metadata(query);
        // get the metadata related to the resources to be added to the .meta file of the resource
        for (const resource of event_resources) {
            const resource_metadata_store: Store = this.get_ldp_resource_metadata(resource);
        }
        // check if the container is full i.e the amount of resources in the container is equal to the bucket size
        // if the container is full, then instantiate a new container and keep adding to it

        for (const relation of metadata.views[0].relations) {
            this.bucket_resources[relation.node] = [];
        }
        this.bucket_resources["none"] = [];
        let earliest_resource_timestamp: number = Infinity;

        this.add_resource_to_containers(event_resources, bucket_size_per_container, metadata);
        
        if (event_resources.length > bucket_size_per_container){
            let event_resource_batch = event_resources.splice(0, bucket_size_per_container);
            for (const resource of event_resource_batch) {
                const bucket = calculateBucket(resource, metadata);
                this.bucket_resources[bucket].push(resource);
                const resource_timestamp = getTimeStamp(resource, metadata.timestampPath);
                if (earliest_resource_timestamp > resource_timestamp) {
                    earliest_resource_timestamp = resource_timestamp;
                }
                // add version identifier to resource
                const resource_store = new Store(resource);
                const subject = resource_store.getSubjects(metadata.timestampPath, null, null)[0];
                resource_store.add(quad(subject, namedNode(metadata.versionOfPath), namedNode(version_id)));
                event_resources.splice(event_resources.indexOf(resource), 1);
                await addResourcesToBuckets(this.bucket_resources, metadata, communication);
            }
        }
        else if (true){

        }


        
        // if (bucket_resources["none"].length < bucket_size_per_container) {
        //     for (const resource of event_resources) {
        //         const bucket = calculateBucket(resource, metadata);
        //         bucket_resources[bucket].push(resource);
        //         const resource_timestamp = getTimeStamp(resource, metadata.timestampPath);
        //         if (earliest_resource_timestamp > resource_timestamp) {
        //             earliest_resource_timestamp = resource_timestamp;
        //         }
        //         // add version identifier to resource
        //         const resource_store = new Store(resource);
        //         const subject = resource_store.getSubjects(metadata.timestampPath, null, null)[0];
        //         resource_store.add(quad(subject, namedNode(metadata.versionOfPath), namedNode(version_id)));
        //         event_resources.splice(event_resources.indexOf(resource), 1);
        //         await addResourcesToBuckets(bucket_resources, metadata, communication);
        //     }
        // }
        // else if (bucket_resources["none"].length >= bucket_size_per_container) {
        //     // we create a new container
        //     const container_url = ldes_in_ldp_url + earliest_resource_timestamp + "/";
        //     await createContainer(container_url, communication);
        // }
    }

    public query_container_publishing() {

    }

    public add_resource_to_containers(resource: Resource[], bucket_size_per_container: number, metadata: any){
        const bucket_resources: {
            [key: string]: Resource[]
        } = {};

        for (const relation of metadata.views[0].relations) {
            bucket_resources[relation.node] = [];
        }
        bucket_resources["none"] = [];
        let earliest_resource_timestamp: number = Infinity;
        let length = resource.length;
        if (length > bucket_size_per_container){
            let event_resource_batch = resource.splice(0, bucket_size_per_container);
            for (const resource of event_resource_batch) {
                const bucket = calculateBucket(resource, metadata);
                bucket_resources[bucket].push(resource);
                const resource_timestamp = getTimeStamp(resource, metadata.timestampPath);
                if (earliest_resource_timestamp > resource_timestamp) {
                    earliest_resource_timestamp = resource_timestamp;
                }
                const resource_store = new Store(resource);

            }
        }
    }

    public get_query_metadata(query: string): any {
        const store = new Store();
        const parsed_query = this.parser.parse(query);
        // console.log(parsed_query);
        return store;
    }

    public get_ldp_resource_metadata(resource: Resource): Store {
        const store = new Store();
        return store;
    }
}