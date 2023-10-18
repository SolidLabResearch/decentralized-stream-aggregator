import { extractDateFromLiteral, filterRelation, ILDESinLDPMetadata, LDESinLDP, LDPCommunication, MetadataParser } from "@treecg/versionawareldesinldp";
import { RSPQLParser } from "../parsers/RSPQLParser";
const aggregator_pod_location = "http://localhost:3000/aggregation_pod/";
const aggregation_pod_ldes_identifier = "http://localhost:3000/aggregation_pod/aggregation_new/";
const parser: RSPQLParser = new RSPQLParser();
import { Member } from "@treecg/types";
let ld_fetch = require('ldfetch');
const ldfetch = new ld_fetch({});
import { Literal } from "n3";
import { Readable } from "stream";
const ldp_communication = new LDPCommunication();
import { DataFactory, Store } from "n3";
import { Quad } from "rdflib/lib/tf-types";
import { AggregationFocusExtractor } from "../parsers/AggregationFocusExtractor";
import { TREE } from "@treecg/ldes-snapshot";
import { hash_string } from "../../utils/Util";
const { quad, namedNode, literal } = DataFactory;

export async function if_aggregated_events_exist(rspql_query: string): Promise<boolean> {
    let parsed_query = parser.parse(rspql_query);
    /*
    Query Streams are the streams that are involved to generate the aggregation events.
    The window size and slide described in the query.
    */
    let query_streams: string[] = [];
    let window_size: number;
    let window_slide: number;
    for (let stream of parsed_query.s2r) {

        query_streams.push(stream.stream_name);
    }
    /*
    The LDES fragment containers containing the aggregation events.
    */
    let fragment_containers: string[] = [];
    /*
    The aggregation pod contains an LDES that contains the aggregation events.
    */
    const aggregation_pod_ldes = new LDESinLDP(aggregation_pod_ldes_identifier, ldp_communication);
    const metadata = await aggregation_pod_ldes.readMetadata();
    for (let quad of metadata) {
        if (quad.predicate.value === "http://www.w3.org/ns/ldp#contains") {
            fragment_containers.push(quad.object.value);
        }
    }
    /*
    Fetching the Function Ontology description of the aggregation function 
    present in the LDP fragment container.
    */
    let fno_description = new Map<string, Quad[]>
    for (let fragment of fragment_containers) {
        let fno_metadata = fragment + '.meta'
        let response = await ldfetch.get(fno_metadata);
        fno_description.set(fragment, response.triples);
    }
    const aggregation_focus_extractor = new AggregationFocusExtractor(rspql_query);
    const focus_of_aggregation = aggregation_focus_extractor.extract_focus();
    let focus: string[] = []
    Object.keys(focus_of_aggregation).forEach((key) => {
        focus.push(focus_of_aggregation[key])
    });

    /*
    LDES fragments containing aggregation events focussed upon
    the aggregation context based upon the query specified.
    */
    let fragment_with_focus: string[] = [];

    for (let aggregation_focus of focus) {
        for (let description of fno_description) {
            let description_quads = description[1];            
            for (let quad of description_quads) {
                if ((quad.object.value == aggregation_focus)) {
                    fragment_with_focus.push(description[0]);
                }
            }
        }
    }



    return true;
}

export async function generate_focus_aggregated_stream(opts: {
    from?: Date;
    to?: Date;
    aggregated_pod_location: string;
    rspql_query: string;
}): Promise<Readable> {

    let { from, to, aggregated_pod_location, rspql_query } = opts ?? {};
    from = opts.from ?? new Date(0);
    to = opts.to ?? new Date();
    const member_stream = new Readable({
        objectMode: true,
        read() {

        }
    });
    let communication = new LDPCommunication();
    let ldes_in_ldp = new LDESinLDP(aggregator_pod_location, communication);
    const metadata = await extractLdesMetadata(ldes_in_ldp);
    const relations = filterRelation(metadata, from, to);


    for (const relation of relations) {
        const resources = ldes_in_ldp.readPage(relation.node);
        const members: Member[] = [];

        for await (const resource of resources) {
            let member_identifier = resource.getSubjects(relation.path, null, null)[0].value;
            resource.removeQuads(resource.getQuads(metadata.eventStreamIdentifier, TREE.member, null, null));
            const member: Member = {
                id: namedNode(member_identifier),
                quads: resource.getQuads(null, null, null, null)
            }

            const member_date_time = extractDateFromMember(member, relation.path);
            // let ldes_fragment_focus_map: Map<string, string[]> = extractFragmentFocus(ldes_in_ldp);
            // const extract_member_focus = extractFocusFromMember(member, relation.path);

            if (from <= member_date_time && member_date_time <= to) {
                members.push({
                    id: namedNode(member_identifier),
                    quads: resource.getQuads(null, null, null, null)
                });
            }

            const sorted_members = members.sort((a: Member, b: Member) => {
                const a_date = extractDateFromMember(a, relation.path);
                const b_date = extractDateFromMember(b, relation.path);
                return a_date.getTime() - b_date.getTime();
            });

            for (const member of sorted_members) {
                member_stream.push(member);
            }
            member_stream.push(null);
        }
    }
    return Promise.resolve(member_stream);
}

export async function extractFragmentFocus(ldes_in_ldp: LDESinLDP) {
    let metadata_store: Store = await ldes_in_ldp.readMetadata();
    let focus_map = new Map<string, string[]>();
    let ldes_fragments: string[] = [];
    const has_focus = "http://www.example.org/has_focus";
    const ldp_contains = "http://www.w3.org/ns/ldp#contains";
    for (let quad of metadata_store) {
        if (quad.predicate.value === ldp_contains) {
            ldes_fragments.push(quad.object.value);
        }
    }

    for (let fragment of ldes_fragments) {
        let fragment_fno_description = await get_fno_description(fragment);
        for (let fragment of fragment_fno_description) {
            if (fragment.predicate.value === has_focus) {
                focus_map.set(ldes_in_ldp.LDESinLDPIdentifier, [fragment.object.value]);
            }
        }
    }
}

export async function get_fno_description(fragment: string) {
    let response = await ldfetch.get(fragment + '.meta');
    return response.triples;
}

export function extractDateFromMember(member: Member, path: string): Date {
    const store = new Store(member.quads);

    // member date
    const dateLiteral = store.getObjects(member.id, path, null)[0] as Literal;
    const memberDateTime = extractDateFromLiteral(dateLiteral);
    return memberDateTime
}

export async function extractLdesMetadata(ldes_in_ldp: LDESinLDP): Promise<ILDESinLDPMetadata> {
    const metadata_store = await ldes_in_ldp.readMetadata();
    return MetadataParser.extractLDESinLDPMetadata(metadata_store, ldes_in_ldp.eventStreamIdentifier);
}


export async function aggregation_results_exist(rspql_query: string): Promise<boolean> {
    // hash the query with the md5 algorithm
    const query_hash = hash_string(rspql_query);
    let query_streams: string[] = [];

    for (let stream of parser.parse(rspql_query).s2r) {
        query_streams.push(stream.stream_name);
    }

    let fragment_containers: string[] = [];
    const aggregation_pod_ldes = new LDESinLDP(aggregation_pod_ldes_identifier, ldp_communication);
    const metadata = await aggregation_pod_ldes.readMetadata();
    for (let quad of metadata) {
        if (quad.predicate.value === "http://www.w3.org/ns/ldp#contains") {
            fragment_containers.push(quad.object.value);
        }
    }

    // fetching the function ontology description of the aggregation function present in the LDP fragment container
    let fno_description = new Map<string, Quad[]>();
    for (let fragment of fragment_containers) {
        let fno_metadata = fragment + '.meta';
        let response = await ldfetch.get(fno_metadata);
        fno_description.set(fragment, response.triples);
    }

    for (let description of fno_description) {
        for (let quad of description[1]){
            if ((quad.object.value == query_hash)) {
                return true;
            }
            else {
                return false;
            }
        }
    }

    return false;
    
}

async function main() {
    let value = aggregation_results_exist(`
    PREFIX saref: <https://saref.etsi.org/core/> 
    PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
    PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT (AVG(?o) AS ?averageHR1)
    FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 120 STEP 20]
    WHERE{
        WINDOW :w1 { ?s saref:hasValue ?o .
                     ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
    } 
    `);

    console.log(await value);
}


main();