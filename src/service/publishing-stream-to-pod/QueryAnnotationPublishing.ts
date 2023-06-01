import { addRelationToNode, extractLdesMetadata, LDESConfig, LDESinLDP, LDESMetadata, LDPCommunication, SolidCommunication, storeToString } from "@treecg/versionawareldesinldp";
import { ILogObj, Logger } from "tslog";
import { RSPQLParser } from "../parsers/RSPQLParser";
import { getTimeStamp, Resource } from "../../utils/ldes-in-ldp/EventSource";
import { Session } from "@rubensworks/solid-client-authn-isomorphic";
import { DataFactory, Store } from "n3";
import { add_resources_with_metadata_to_buckets, check_if_container_exists, createBucketUrl, create_ldp_container } from "../../utils/ldes-in-ldp/EventSourceUtil";
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

    public async publish(query: string, ldes_in_ldp_url: string, resources: Resource[], version_id: string, bucket_size_per_container: number, config: LDESConfig, start_time: Date, end_time: Date, session?: Session): Promise<void> {
        const comunication = session ? new SolidCommunication(session) : new LDPCommunication();
        const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_url, comunication);
        const metadata_store = await ldes_in_ldp.readMetadata();
        const metadata: LDESMetadata = extractLdesMetadata(metadata_store, ldes_in_ldp_url + "#EventStream");
        const bucket_resources: { [key: string]: Resource[] } = {};
        for (const relation of metadata.views[0].relations) {
            bucket_resources[relation.node] = [];
        }
        bucket_resources["none"] = [];
        let earliest_resource_timestamp = Infinity;
        const resource_timestamp = getTimeStamp(resources[resources.length - 1], metadata.timestampPath);
        const bucket_url = createBucketUrl(ldes_in_ldp_url, resource_timestamp);
        if ((await check_if_container_exists(ldes_in_ldp, bucket_url)) === false) {
            create_ldp_container(bucket_url, comunication);
            let query_metadata = this.get_query_metadata(query, start_time, end_time);
            this.patch_metadata(query_metadata, bucket_url, comunication);
            bucket_resources[bucket_url] = [];
            for (const resource of resources) {
                bucket_resources[bucket_url].push(resource);
                if (earliest_resource_timestamp > resource_timestamp) {
                    earliest_resource_timestamp = resource_timestamp;
                }
                const resource_store = new Store(resource);
                const subject = resource_store.getSubjects(metadata.timestampPath, null, null)[0];
                resource_store.add(quad(subject, namedNode(metadata.timestampPath), namedNode(version_id)));
            }
        }
        if (bucket_resources["none"].length !== 0) {
            const new_container_url = ldes_in_ldp_url + earliest_resource_timestamp + "/";
            if ((await check_if_container_exists(ldes_in_ldp, new_container_url) === false)) {
                create_ldp_container(new_container_url, comunication);
            }
            const store = new Store();
            addRelationToNode(store, {
                date: new Date(earliest_resource_timestamp),
                nodeIdentifier: ldes_in_ldp_url,
                treePath: config.treePath,
            });
            const insertBody = `INSERT DATA {${storeToString(store)}}`;
            await editMetadata(ldes_in_ldp_url, comunication, insertBody);
            bucket_resources[new_container_url] = bucket_resources["none"];
        }
        delete bucket_resources["none"];
        await add_resources_with_metadata_to_buckets(bucket_resources, metadata, comunication);
    }

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
                quad(namedNode('http://example.org/aggregation_function'), namedNode('https://w3id.org/function/ontology#name'), namedNode('aggregation_function')),
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
