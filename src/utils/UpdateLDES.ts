import { LDESinLDP, LDPCommunication } from "@treecg/versionawareldesinldp";
const N3 = require('n3');
const { DataFactory } = N3
const { namedNode, literal, defaultGraph, quad } = DataFactory;
const aggregation_location = 'http://localhost:3000/dataset_participant1/data/';
const communication = new LDPCommunication();

async function append() {
    const ldes_in_ldp = new LDESinLDP(aggregation_location, communication);
    const store = new N3.Store();
    const parser = new N3.Parser();
    parser.parse(

        `@prefix : <http://localhost:3000/dataset_participant1/data/#>.
        <https://dahcc.idlab.ugent.be/Protego/_participant1/obs1703> <http://rdfs.org/ns/void#inDataset> <https://dahcc.idlab.ugent.be/Protego/_participant1>;
            <https://saref.etsi.org/core/measurementMadeBy> <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/E4.A03846.Accelerometer>;
            <http://purl.org/dc/terms/isVersionOf> <https://saref.etsi.org/core/Measurement>;
            <https://saref.etsi.org/core/relatesToProperty> <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/wearable.acceleration.z>;
            <https://saref.etsi.org/core/hasTimestamp> "2023-08-24T12:24:32.5150"^^<http://www.w3.org/2001/XMLSchema#dateTime>;
            <https://saref.etsi.org/core/hasValue> "53.0"^^<http://www.w3.org/2001/XMLSchema#float>.
            `
        ,
        (error: any, quad: any, prefixes: any) => {
            if (quad) {
                console.log(quad);
                store.addQuad(quad);
            }
            else {

                for (let i = 0; i < 5; i++) {
                    if (store.size > 0) {
                        ldes_in_ldp.append(store);
                    }
                }
            }

        });
}

async function inbox() {
    const ldes_in_ldp = new LDESinLDP(aggregation_location, communication);
    const inbox = await ldes_in_ldp.readMetadata();

    for (const quad of inbox) {
        if (quad.predicate.value === 'http://www.w3.org/ns/ldp#inbox') {
            console.log(quad.object.value);
        }
    }
}

append();