import { LDESinLDP, LDPCommunication } from "@treecg/versionawareldesinldp";
const N3 = require('n3');
const { DataFactory } = N3
const { namedNode, literal, defaultGraph, quad } = DataFactory;
const aggregation_location = 'http://localhost:3000/aggregation_pod/aggregation_new/';
const communication = new LDPCommunication();

async function append() {
    const ldes_in_ldp = new LDESinLDP(aggregation_location, communication);
    const store = new N3.Store();
    const myQuad = quad(
        namedNode('https://ruben.verborgh.org/profile/#me'), // Subject
        namedNode('http://xmlns.com/foaf/0.1/givenName'),    // Predicate
        literal('Ruben', 'en'),                              // Object
        defaultGraph(),                                      // Graph
    );
    store.addQuad(myQuad);
    ldes_in_ldp.append(store);
}   

append();