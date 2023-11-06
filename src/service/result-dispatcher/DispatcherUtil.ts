import { LDESinLDP, LDPCommunication } from '@treecg/versionawareldesinldp';
import { Quad } from 'rdflib/lib/tf-types';
import * as CONFIG from '../../config/ldes_properties.json';
import { hash_string_md5 } from '../../utils/Util';
import { Readable } from "stream";
import { extractLdesMetadata } from './ResultUtil';
import { TREE } from '@treecg/ldes-snapshot';
import { namedNode } from 'rdflib';
const AGGREGATION_POD = CONFIG.LIL_URL;
const TREE_PATH = CONFIG.TREE_PATH;
let ld_fetch = require('ldfetch');
const ldfetch = new ld_fetch({});

export async function generated_aggregated_stream(rspql_query: string) {
    // add the feature for query isomorphism here.
    let aggregated_events_exist:boolean = false;
    let aggregation_ldes = new LDESinLDP(AGGREGATION_POD, new LDPCommunication());
    let metadata = await aggregation_ldes.readMetadata();
    let fragment_containers: string[] = [];

    for (let quad of metadata) {
        if (quad.predicate.value === "http://www.w3.org/ns/ldp#contains") {
            fragment_containers.push(quad.object.value);
        }
    }

    let fno_description = new Map<string, Quad[]>()
    for (let fragment of fragment_containers) {
        let fno_metadata = fragment + '.meta';
        let response = await ldfetch.get(fno_metadata);
        fno_description.set(fragment, response.triples);
    }

    fno_description.forEach((value, key) => {
        let quads = value;
        for (let quad of quads) {
            if (quad.predicate.value === "http://www.example.org/has_query_hash") {
                if (hash_string_md5(rspql_query) === quad.object.value) {
                    aggregated_events_exist = true;
                    add_event_to_stream({
                        fragment_containers: fragment_containers
                    });
                }
                else {
                }
            }
        }
    });
    return aggregated_events_exist;
}

export async function add_event_to_stream(opts:{
from?: Date;
to?: Date;
fragment_containers: string[];
}): Promise<Readable>{
    let {from, to, fragment_containers} = opts ?? {};

    from = opts.from ?? new Date(0);
    to = opts.to ?? new Date();
    fragment_containers = [];

    const event_stream = new Readable({
        objectMode: true,
        read(){

        }
    });
    let ldes = new LDESinLDP(AGGREGATION_POD, new LDPCommunication());
    const metadata = await extractLdesMetadata(ldes);
    for (let fragment of opts.fragment_containers) {
        const resources = ldes.readPage(fragment);
        for await (const resource of resources) {
            let member_identifier = resource.getSubjects(TREE_PATH, null, null)[0].value;
            resource.removeQuads(resource.getQuads(metadata.eventStreamIdentifier, TREE.member, null, null));
            const member = {
                id: namedNode(member_identifier),
                quads: resource.getQuads(null, null, null, null)
            }   

            
        }
        
    }

    let counter = 0;
    event_stream.on('data', (data) => {
        counter++;
    });
    event_stream.on('end', () => {
        console.log(counter);
    });
    
    return event_stream;
}

async function main() {
    let query = `
    PREFIX saref: <https://saref.etsi.org/core/> 
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
PREFIX : <https://rsp.js/>
REGISTER RStream <output> AS
SELECT (AVG(?o) AS ?averageHR1)
FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 1800 STEP 20]
WHERE{
    WINDOW :w1 { ?s saref:hasValue ?o .
                 ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
}     `;

    let value = await generated_aggregated_stream(query);
    console.log(value);
}

main();