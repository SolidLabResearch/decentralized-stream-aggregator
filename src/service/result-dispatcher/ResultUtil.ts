import { LDESinLDP, LDPCommunication } from "@treecg/versionawareldesinldp";
import { RSPQLParser } from "../parsers/RSPQLParser";
const aggregator_pod_location = "http://localhost:3000/aggregation_pod/";
const aggregation_pod_ldes_identifier = "http://localhost:3000/aggregation_pod/aggregation_new/";
const parser: RSPQLParser = new RSPQLParser();
let ld_fetch = require('ldfetch');
const ldfetch = new ld_fetch({});
const ldp_communication = new LDPCommunication();
import { DataFactory, Store } from "n3";
import { Quad } from "rdflib/lib/tf-types";
import { AggregationFocusExtractor } from "../parsers/AggregationFocusExtractor";
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


async function main() {
    let value = if_aggregated_events_exist(`
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
    `)

    console.log(value);
}


main();