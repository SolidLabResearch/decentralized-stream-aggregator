import { addRelationToNode, LDESConfig, LDESinLDP, LDPCommunication, MetadataParser, patchSparqlUpdateInsert, SolidCommunication } from "@treecg/versionawareldesinldp";
import { ILogObj, Logger } from "tslog";
import { createBucketUrl, getTimeStamp, Resource } from "../../utils/ldes-in-ldp/EventSource";
import { RSPQLParser } from "../parsers/RSPQLParser";
import { Session } from "@rubensworks/solid-client-authn-isomorphic";
import { DataFactory, Store } from "n3";
import { add_resources_with_metadata_to_buckets, check_if_container_exists } from "../../utils/ldes-in-ldp/EventSourceUtil";
import { v4 as uuidv4 } from 'uuid';
import { storeToString } from "@treecg/ldes-snapshot";
import { ParsedQuery } from "../parsers/ParsedQuery";
import { editMetadata } from "../../utils/ldes-in-ldp/Util";
const { quad, namedNode, literal } = DataFactory;

export class QueryAnnotationPublishing {
    public logger: Logger<ILogObj>;
    public parser: RSPQLParser;
    public bucket_resources: {
        [key: string]: Resource[]
    }

    constructor() {
        this.logger = new Logger();
        this.parser = new RSPQLParser();
        this.bucket_resources = {};
    }

    public async publish(rspql_query: string, ldes_in_ldp_url: string, resources: Resource[], version_id: string, config: LDESConfig, start_time: Date, end_time: Date, session?: Session): Promise<void> {
        const communication = session ? new SolidCommunication(session) : new LDPCommunication();
        const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_url, communication);
        const metadata_store = await ldes_in_ldp.readMetadata();
        const metadata = MetadataParser.extractLDESinLDPMetadata(metadata_store, ldes_in_ldp_url + "#EventStream");
        const bucket_resources: {
            [key: string]: Resource[]
        } = {};
        for (const relation of metadata.view.relations) {
            bucket_resources[relation.node] = [];
        }
        bucket_resources["none"] = [];
        let earliest_resource_timestamp = Infinity;
        const resource_timestamp = getTimeStamp(resources[resources.length - 1], config.treePath);
        const bucket_url = createBucketUrl(ldes_in_ldp_url, resource_timestamp);

        if (await check_if_container_exists(ldes_in_ldp, bucket_url) == false) {
            ldes_in_ldp.newFragment(new Date(resource_timestamp));
            let query_metadata = this.get_query_metadata(rspql_query, start_time, end_time);
            this.patch_metadata(query_metadata, bucket_url, communication);
            this.logger.info(`Patching Metadata for ${bucket_url}`);
            bucket_resources[bucket_url] = [];
            for (const relation of metadata.view.relations) {
                for (const resource of resources) {
                    bucket_resources[relation.node].push(resource);
                    if (earliest_resource_timestamp > resource_timestamp) {
                        earliest_resource_timestamp = resource_timestamp;
                    }

                    const resource_store = new Store(resource);
                    const subject = resource_store.getSubjects(config.treePath, null, null)[0];
                    resource_store.add(
                        quad(subject, namedNode(config.treePath), namedNode(version_id))
                    );
                }
                let query_metadata = this.get_query_metadata(rspql_query, start_time, end_time);
                this.patch_metadata(query_metadata, relation.node, communication);
            }
        }

        if (bucket_resources["none"].length !== 0) {
            const new_container_url = ldes_in_ldp_url + earliest_resource_timestamp + "/";
            if ((await check_if_container_exists(ldes_in_ldp, new_container_url) === false)) {
                ldes_in_ldp.newFragment(new Date(earliest_resource_timestamp));
            }

            const store = new Store();
            addRelationToNode(
                store, {
                date: new Date(earliest_resource_timestamp),
                nodeIdentifier: new_container_url,
                treePath: config.treePath
            }
            );

            const insertBody = `INSERT DATA {${storeToString(store)}}`;
            await editMetadata(ldes_in_ldp_url, communication, insertBody);
            bucket_resources[new_container_url] = bucket_resources["none"];
        }

        delete bucket_resources["none"];
        await add_resources_with_metadata_to_buckets(bucket_resources, metadata, communication).then(() => {
        });
    }




    public get_query_metadata(rspql_query: string, start_time: Date, end_time: Date): Store {
        let query_identifier_uuid = uuidv4();
        const aggregation_query_identifier: string = `http://example.org/aggregation/${query_identifier_uuid}`;
        const query_metadata: ParsedQuery = this.parser.parse(rspql_query);
        let stream_names = [];
        for (const stream of query_metadata.s2r) {
            stream_names.push(stream.stream_name);
        }
        const window_size = query_metadata.s2r[0].width;
        const window_slide = query_metadata.s2r[0].slide;
        const window_name = query_metadata.s2r[0].window_name;
        let projection_variables = [];
        for (const variable of query_metadata.projection_variables) {
            projection_variables.push(variable);
        }

        const store = new Store();

        store.addQuads(
            [
                quad(namedNode('http://example.org/aggregation_function_execution'), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('https://w3id.org/function/ontology#Execution')),
                quad(namedNode('http://example.org/aggregation_function_execution'), namedNode('https://w3id.org/function/ontology#executes'), namedNode('http://example.org/aggregation_function')),
            ]
        )

        return store;
    }

    public patch_metadata(store: Store, location: string, ldp_communication: LDPCommunication): void {
        let location_metadata = location + ".meta";
        ldp_communication.patch(location_metadata, `INSERT DATA {${storeToString(store)}}`).then((response) => {
            if (response.status == 200 || 201 || 205) {
                this.logger.debug(`The metdata of the LDP container is patched successfully.`)
            }
        }).catch((error) => {
            this.logger.error(`The metadata of the LDP container could not be patched. ${error}`)
        })
    }
}