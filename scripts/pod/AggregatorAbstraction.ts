import { storeToString } from "@treecg/versionawareldesinldp";

const N3 = require('n3');
export class AggregatorAbstraction {
    /**
     *  
     * A map of the solid pod URLs with the location of the aggregator.
     * @type {Map<string, string>}
     * @memberof AggregatorAbstraction
     */
    pod_aggregator_location: Map<string, string>;
    constructor(aggregator_map: Map<string, string>) {
        this.pod_aggregator_location = aggregator_map;
    }

    public add_aggregator_to_pod_card() {
        this.pod_aggregator_location.forEach((pod_location: string, aggregator_location: string) => {
            this.patch_request(pod_location, aggregator_location);
        });
    }

    public patch_request(solid_pod_url: string, aggregator_location: string) {
        const store = new N3.Store();
        store.addQuad(
            N3.DataFactory.namedNode(solid_pod_url + '/profile/card#me'),
            N3.DataFactory.namedNode('http://w3id.org/rsp/vocals-sd#hasFeature'),
            N3.DataFactory.namedNode('http://w3id.org/rsp/vocals-sd#ProcessingService')
        );
        store.addQuad(
            N3.DataFactory.namedNode('http://w3id.org/rsp/vocals-sd#ProcessingService'),
            N3.DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            N3.DataFactory.namedNode('http://argahsuknesib.github.io/asdo/StreamAggregationService')
        );
        store.addQuad(
            N3.DataFactory.namedNode('http://argahsuknesib.github.io/asdo/StreamAggregationService'),
            N3.DataFactory.namedNode('http://xmlns.com/foaf/0.1/webId'),
            N3.DataFactory.namedNode(aggregator_location + '/#this')
        );
        fetch(solid_pod_url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/sparql-update'
            },
            body: "INSERT DATA {" + storeToString(store) + "}",
        });
    }
}