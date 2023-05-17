

const QueryEngine = require('@comunica/query-sparql-link-traversal').QueryEngine;
const link_traversal_engine = new QueryEngine();

const query_to_find_aggregator: string = `
    SELECT ?aggregator_location WHERE {
        <http://localhost:3000/dataset_participant1/profile/card#me> <http://w3id.org/rsp/vocals-sd#hasFeature> <http://w3id.org/rsp/vocals-sd#ProcessingService> .
        <http://w3id.org/rsp/vocals-sd#ProcessingService> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://argahsuknesib.github.io/asdo/StreamAggregationService> .
        <http://argahsuknesib.github.io/asdo/StreamAggregationService> <http://xmlns.com/foaf/0.1/webId> ?web_id .
        ?web_id <http://argahsuknesib.github.io/aggregator_location> ?aggregator_location .
    }
`;

const test_query: string = `
    SELECT ?web_id WHERE {
        <http://localhost:3000/dataset_participant1/profile/card#me> <http://w3id.org/rsp/vocals-sd#hasFeature> <http://w3id.org/rsp/vocals-sd#ProcessingService> .
        <http://w3id.org/rsp/vocals-sd#ProcessingService> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?service .
        ?service <http://xmlns.com/foaf/0.1/webId> ?web_id .
    }`;
async function main() {
    const binding_stream = await link_traversal_engine.queryBindings(test_query, {
        sources: ['http://localhost:3000/dataset_participant1/profile/card#me']
    });

    binding_stream.on('data', (binding: any) => {
        let id = binding.get('web_id').value;
        console.log(new URL(id).origin);
    });
}

main();
