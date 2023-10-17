import { addRelationToNode, createContainer, extractLdesMetadata, LDESConfig, LDESinLDP, LDESMetadata, LDPCommunication, MetadataParser, SolidCommunication, storeToString } from "@treecg/versionawareldesinldp";
import { ILogObj, Logger } from "tslog";
import { RSPQLParser } from "../parsers/RSPQLParser";
import { getTimeStamp, Resource } from "../../utils/ldes-in-ldp/EventSource";
import { Session } from "@rubensworks/solid-client-authn-isomorphic";
import { DataFactory, Store } from "n3";
import { add_resources_with_metadata_to_buckets, calculateBucket, check_if_container_exists, createBucketUrl, create_ldp_container } from "../../utils/ldes-in-ldp/EventSourceUtil";
import { editMetadata } from "../../utils/ldes-in-ldp/Util";
import { v4 as uuidv4 } from 'uuid';
import { AggregationFocusExtractor } from "../parsers/AggregationFocusExtractor";
import { ParsedQuery } from "../parsers/ParsedQuery";
const { quad, namedNode, literal } = DataFactory;

export class QueryAnnotationPublishing {
    private logger: Logger<ILogObj>;
    public parser: RSPQLParser;
    public bucket_resources: {
        [key: string]: Resource[];
    }
    constructor() {
        this.logger = new Logger();
        this.parser = new RSPQLParser();
        this.bucket_resources = {};
    }


    public async publish(query: string, ldes_in_ldp_url: string, resources: Resource[], version_id: string, config: LDESConfig, start_time: Date, end_time: Date, session ?: Session) : Promise <void> {
        const communication = session ? new SolidCommunication(session) : new LDPCommunication();
        const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_url, communication);
        const metadata_store = await ldes_in_ldp.readMetadata();
        const metadata = MetadataParser.extractLDESinLDPMetadata(metadata_store, ldes_in_ldp_url + "#EventStream");
        const bucketResources: {[key: string]: Resource[]} = {}
        for (const relation of metadata.view.relations) {
            bucketResources[relation.node] = []
        }
        bucketResources["none"] = [];
        let earliest_resource_timestamp = Infinity;
        const resource_timestamp = getTimeStamp(resources[resources.length - 1], config.treePath);
        const bucket_url = createBucketUrl(ldes_in_ldp_url, resource_timestamp);
        if (await check_if_container_exists(ldes_in_ldp, bucket_url) == false) {
            ldes_in_ldp.newFragment(new Date(resource_timestamp));
            let query_metadata = this.get_query_metadata(query, start_time, end_time);
            this.patch_metadata(query_metadata, bucket_url, communication);
            console.log(`Patching metadata for ${bucket_url}`);
            bucketResources[bucket_url] = [];
            for (const relation of metadata.view.relations){
                for (const resource of resources){
                    bucketResources[relation.node].push(resource);
                    if (earliest_resource_timestamp > resource_timestamp) {
                        earliest_resource_timestamp = resource_timestamp;
                    }
                    const resource_store = new Store(resource);
                    const subject = resource_store.getSubjects(config.treePath, null, null)[0];
                    resource_store.add(quad(subject, namedNode(config.treePath), namedNode(version_id)));
                }
                let query_metadata = this.get_query_metadata(query, start_time, end_time);
                this.patch_metadata(query_metadata, relation.node, communication);
            }
    
        }

        if (bucketResources["none"].length !== 0){
            const new_container_url = ldes_in_ldp_url + earliest_resource_timestamp + "/";
            if ((await check_if_container_exists(ldes_in_ldp, new_container_url) === false)) {
                ldes_in_ldp.newFragment(new Date(earliest_resource_timestamp));
            }

            const store = new Store();
            addRelationToNode(store, {
                date: new Date(earliest_resource_timestamp),
                nodeIdentifier: new_container_url,
                treePath: config.treePath,
            });
            const insertBody = `INSERT DATA {${storeToString(store)}}`;
            await editMetadata(ldes_in_ldp_url, communication, insertBody);
            bucketResources[new_container_url] = bucketResources["none"];
        }
        delete bucketResources["none"];
    await add_resources_with_metadata_to_buckets(bucketResources, metadata, communication);
        
    }
    // public async publish(query: string, ldes_in_ldp_url: string, resources: Resource[], version_id: string, config: LDESConfig, start_time: Date, end_time: Date, session ?: Session): Promise<void> {
    //     const communication = session ? new SolidCommunication(session) : new LDPCommunication();
    //     const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_url, communication);
    //     const metadata_store = await ldes_in_ldp.readMetadata();
    //     const metadata = MetadataParser.extractLDESinLDPMetadata(metadata_store, ldes_in_ldp_url + "#EventStream");
    //     const bucketResources: {[key: string]: Resource[]} = {}
    //     for (const relation of metadata.view.relations) {
    //         bucketResources[relation.node] = []
    //     }
    //     bucketResources["none"] = [];
    //     let earliest_resource_timestamp = Infinity;

    //     for (const resource of resources){
    //         const bucket = calculateBucket(resource, metadata);
    //         bucketResources[bucket].push(resource);

    //         const resource_timestamp = getTimeStamp(resources[resource.length - 1], config.treePath);
    //         if (earliest_resource_timestamp > resource_timestamp) {
    //             earliest_resource_timestamp = resource_timestamp;
    //         }

    //         const resource_store = new Store(resource);
    //         const subject = resource_store.getSubjects(config.treePath, null, null)[0];
    //     }
    //     console.log(resources.length);
        
    //     if (bucketResources["none"].length !== 0){
    //         const new_container_url = ldes_in_ldp_url + earliest_resource_timestamp + "/";
    //         ldes_in_ldp.newFragment(new Date(earliest_resource_timestamp));
    //         // await createContainer(new_container_url, communication);
    //         const store = new Store();

    //         addRelationToNode(store, {
    //             date: new Date(earliest_resource_timestamp),
    //             nodeIdentifier: new_container_url,
    //             treePath: config.treePath,
    //         })
    //         bucketResources[new_container_url] = bucketResources["none"];
    //     }

    //     // console.log(bucketResources.bucket_url);
        
    //     delete bucketResources["none"];
    //     await add_resources_with_metadata_to_buckets(bucketResources, metadata, communication);
    // }

    // public async publish(query: string, ldes_in_ldp_url: string, resources: Resource[], version_id: string, config: LDESConfig, start_time: Date, end_time: Date, session?: Session): Promise<void> {
    //     const communication = session ? new SolidCommunication(session) : new LDPCommunication();
    //     const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_url, communication);
    //     const metadata_store = await ldes_in_ldp.readMetadata();
    //     const metadata = MetadataParser.extractLDESinLDPMetadata(metadata_store, ldes_in_ldp_url + "#EventStream");
    //     const bucket_resources: { [key: string]: Resource[] } = {};
    //     for (const relation of metadata.view.relations) {
    //         bucket_resources[relation.node] = [];
    //     }
    //     const store = new Store();
    //     bucket_resources["none"] = [];
    //     console.log(bucket_resources);
    //     const resource_timestamp = getTimeStamp(resources[resources.length - 1], config.treePath);
    //     let earliest_resource_timestamp = Infinity;
    //     const bucket_url = createBucketUrl(ldes_in_ldp_url, resource_timestamp + 7200000);
    //     if (await check_if_container_exists(ldes_in_ldp, bucket_url) == false) {
    //         console.log(new Date(resource_timestamp), resource_timestamp);
    //         let resource_date = new Date(resource_timestamp);
    //         resource_date.setHours(resource_date.getHours() + 2);
    //         ldes_in_ldp.newFragment(resource_date);
    //         let query_metadata = this.get_query_metadata(query, start_time, end_time);
    //         this.patch_metadata(query_metadata, bucket_url, communication);
    //         bucket_resources[bucket_url] = [];
    //         for (const resource of resources) {
    //             bucket_resources[bucket_url].push(resource);
    //             if (earliest_resource_timestamp > resource_timestamp) {
    //                 earliest_resource_timestamp = resource_timestamp;
    //             }
    //             const resource_store = new Store(resource);
    //             const subject = resource_store.getSubjects(config.treePath, null, null)[0];
    //             resource_store.add(quad(subject, namedNode(config.treePath), namedNode(version_id)));
    //         }
    //         addRelationToNode(store, {
    //             date: new Date(earliest_resource_timestamp),
    //             nodeIdentifier: bucket_url,
    //             treePath: config.treePath,
    //         });
    //     }

    //     // if (bucket_resources["none"].length !== 0) {
    //     //     const new_container_url = ldes_in_ldp_url + earliest_resource_timestamp + "/";
    //     //     console.log(earliest_resource_timestamp);
    //     //     if ((await check_if_container_exists(ldes_in_ldp, new_container_url) === false)) {
    //     //         ldes_in_ldp.newFragment(new Date(earliest_resource_timestamp));
    //     //     }
    //     //     addRelationToNode(store, {
    //     //         date: new Date(earliest_resource_timestamp),
    //     //         nodeIdentifier: new_container_url,
    //     //         treePath: config.treePath,
    //     //     });
    //     //     const insertBody = `INSERT DATA {${storeToString(store)}}`;
    //     //     await editMetadata(ldes_in_ldp_url, communication, insertBody);
    //     //     bucket_resources[new_container_url] = bucket_resources["none"];
    //     // }
    //     // const insertBody = `INSERT DATA {${storeToString(store)}}`;
    //     // await editMetadata(ldes_in_ldp_url, communication, insertBody);
    //     // delete bucket_resources["none"];
    //     // console.log(bucket_resources.bucket_url);
    //     await add_resources_with_metadata_to_buckets(bucket_resources, metadata, communication);
    // }

    // const comunication = session ? new SolidCommunication(session) : new LDPCommunication();
    // const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_url, comunication);
    // const metadata_store = await ldes_in_ldp.readMetadata();
    // const metadata = MetadataParser.extractLDESinLDPMetadata(metadata_store, ldes_in_ldp_url + "#EventStream");
    // const bucket_resources: { [key: string]: Resource[] } = {};
    // for (const relation of metadata.view.relations) {
    //     bucket_resources[relation.node] = [];
    // }        
    // bucket_resources["none"] = [];
    // let earliest_resource_timestamp = Infinity;
    // const resource_timestamp = getTimeStamp(resources[resources.length - 1], config.treePath);
    // console.log(resource_timestamp);

    // const bucket_url = createBucketUrl(ldes_in_ldp_url, resource_timestamp);
    // const store = new Store();
    // if ((await check_if_container_exists(ldes_in_ldp, bucket_url)) === false) {
    //     ldes_in_ldp.newFragment(new Date(resource_timestamp));
    //     let query_metadata = this.get_query_metadata(query, start_time, end_time);
    //     this.patch_metadata(query_metadata, bucket_url, comunication);
    //     bucket_resources[bucket_url] = [];
    //     for (const resource of resources) {
    //         bucket_resources[bucket_url].push(resource);
    //         if (earliest_resource_timestamp > resource_timestamp) {
    //             earliest_resource_timestamp = resource_timestamp;
    //         }
    //         const resource_store = new Store(resource);
    //         const subject = resource_store.getSubjects(config.treePath, null, null)[0];
    //         resource_store.add(quad(subject, namedNode(config.treePath), namedNode(version_id)));
    //     }
    //     addRelationToNode(store, {
    //         date: new Date(earliest_resource_timestamp),
    //         nodeIdentifier: bucket_url,
    //         treePath: config.treePath,
    //     });
    // }
    // if (bucket_resources["none"].length !== 0) {
    //     const store = new Store();
    //     const new_container_url = ldes_in_ldp_url + earliest_resource_timestamp + "/";
    //     console.log(earliest_resource_timestamp);

    //     if ((await check_if_container_exists(ldes_in_ldp, new_container_url) === false)) {
    //         ldes_in_ldp.newFragment(new Date(earliest_resource_timestamp));
    //     }
    //     addRelationToNode(store, {
    //         date: new Date(earliest_resource_timestamp),
    //         nodeIdentifier: new_container_url,
    //         treePath: config.treePath,
    //     });
    //     const insertBody = `INSERT DATA {${storeToString(store)}}`;
    //     await editMetadata(ldes_in_ldp_url, comunication, insertBody);
    //     bucket_resources[new_container_url] = bucket_resources["none"];
    // }
    // const insertBody = `INSERT DATA {${storeToString(store)}}`;
    // await editMetadata(ldes_in_ldp_url, comunication, insertBody);
    // delete bucket_resources["none"];
    // // await add_resources_with_metadata_to_buckets(bucket_resources, metadata, comunication);
    public get_query_metadata(query: string, start_time: Date, end_time: Date): Store {
        let query_identifier_uuid = uuidv4();
        const aggregation_query_identifier: string = `http://example.org/aggregation_query/${query_identifier_uuid}`;
        const aggregation_focus_extractor = new AggregationFocusExtractor(query);
        const focus_of_aggregation = aggregation_focus_extractor.extract_focus();
        let focus: string = "";
        Object.keys(focus_of_aggregation).forEach((key) => {
            focus = focus_of_aggregation[key];
        });
        const query_metadata: ParsedQuery = this.parser.parse(query);
        const stream_name = query_metadata.s2r[0].stream_name;
        const store = new Store();
        const window_size = query_metadata.s2r[0].width;
        const window_slide = query_metadata.s2r[0].slide;
        const window_name = query_metadata.s2r[0].window_name;
        const projection_variable = query_metadata.projection_variables[0];

        store.addQuads(
            [
                quad(namedNode('http://example.org/aggregation_function_execution'), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('https://w3id.org/function/ontology#Execution')),
                quad(namedNode('http://example.org/aggregation_function_execution'), namedNode('https://w3id.org/function/ontology#executes'), namedNode('http://example.org/aggregation_function')),
                quad(namedNode('http://example.org/aggregation_function_execution'), namedNode('http://w3id.org/rsp/vocals-sd#registeredStreams'), namedNode(`${stream_name}`)),
                quad(namedNode('http://example.org/aggregation_function_execution'), namedNode('http://example.org/aggregation_start_time'), literal(`${start_time}`)),
                quad(namedNode('http://example.org/aggregation_function_execution'), namedNode('http://example.org/aggregation_end_time'), literal(`${end_time}`)),
                quad(namedNode('http://example.org/aggregation_function_execution'), namedNode('http://example.org/last_execution_time'), literal(Date.now())),
                quad(namedNode('http://example.org/aggregation_function_execution'), namedNode('http://example.org/aggregation_query'), namedNode(`${aggregation_query_identifier}`)),
                quad(namedNode('http://example.org/aggregation_function'), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('https://w3id.org/function/ontology#Function')),
                quad(namedNode('http://example.org/aggregation_function'), namedNode('https://w3id.org/function/ontology#name'), literal('aggregation_function', 'en')),
                quad(namedNode('http://example.org/aggregation_function'), namedNode('http://purl.org/dc/terms/description'), literal('A function that executes an aggregation function on a RDF stream of data', 'en')),
                quad(namedNode('http://example.org/aggregation_function'), namedNode('http://w3id.org/function/ontology#solves'), namedNode('http://example.org/continuous_monitoring_with_solid')),
                quad(namedNode('http://example.org/aggregation_function'), namedNode('http://w3id.org/function/ontology#expects'), namedNode('http://argahsuknesib.github.io/asdo/parameters/solid_pod_url')),
                quad(namedNode('http://example.org/aggregation_function'), namedNode('http://w3id.org/function/ontology#expects'), namedNode('http://argahsuknesib.github.io/asdo/parameters/aggregation_query')),
                quad(namedNode('http://example.org/aggregation_function'), namedNode('http://w3id.org/function/ontology#expects'), namedNode('http://argahsuknesib.github.io/asdo/parameters/latest_minutes_to_monitor')),
                quad(namedNode('http://example.org/aggregation_function'), namedNode('http://w3id.org/function/ontology#returns'), namedNode('http://example.org/aggregation_result_stream')),
                quad(namedNode('http://example.org/aggregation_function'), namedNode('http://w3id.org/function/ontology#implements'), namedNode('http://example.org/solid_stream_aggregation_function')),
                quad(namedNode('http://example.org/aggregation_result_stream'), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://w3id.org/function/ontology#OutputStream')),
                quad(namedNode('http://example.org/aggregation_result_stream'), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://purl.oclc.org/NET/UNIS/sao/sao#StreamData')),
                quad(namedNode('http://example.org/aggregation_result_stream'), namedNode('http://purl.org/dc/terms/description'), literal('The stream of generated aggregation data that is the result of the aggregation function', 'en')),
                quad(namedNode('http://example.org/continuous_monitoring_with_solid'), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://w3id.org/function/ontology#Problem')),
                quad(namedNode('http://argahsuknesib.github.io/asdo/parameters/aggregation_query'), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://w3id.org/function/ontology#Parameter')),
                quad(namedNode(`${aggregation_query_identifier}`), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://w3id.org/function/ontology#Query')),
                quad(namedNode(`${aggregation_query_identifier}`), namedNode('http://www.example.org/has_query_string'), literal(`${query}`)),
                quad(namedNode(`${aggregation_query_identifier}`), namedNode('http://www.example.org/has_projection_variable'), literal(`${projection_variable}`)),
                quad(namedNode(`${aggregation_query_identifier}`), namedNode('http://www.example.org/has_window_name'), namedNode(`${window_name}`)),
                quad(namedNode(`${aggregation_query_identifier}`), namedNode('http://www.example.org/has_window_size'), literal(window_size)),
                quad(namedNode(`${aggregation_query_identifier}`), namedNode('http://www.example.org/has_window_slide'), literal(window_slide)),
                quad(namedNode(`${aggregation_query_identifier}`), namedNode('http://www.example.org/has_focus'), namedNode(`${focus}`)),
            ])
        return store;
    }
    public patch_metadata(store: Store, location: string, ldp_communication: LDPCommunication): void {
        let location_metadata = location + '.meta';
        ldp_communication.patch(location_metadata, `INSERT DATA {${storeToString(store)}}`).then((response) => {
            if (response.status == 200 || 201 || 205) {
                this.logger.debug("The metadata of the LDP container is patched successfully")
            }
        }).catch((error) => {
            this.logger.error("There is an error while patching the metadata of the LDP container", error);
        });
    }
}
