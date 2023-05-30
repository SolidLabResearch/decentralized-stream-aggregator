import { isomorphic } from "rdf-isomorphic";
import { DataFactory, Quad } from "rdf-data-factory";
import { BlankNode } from "n3";
let sparqlParser = require('sparqljs').Parser;
const factory = new DataFactory();
let SPARQLParser = new sparqlParser();

async function main() {
    let bgpOne = generateBGPQuadsFromQueries(query_one);    
    let bgpTwo = generateBGPQuadsFromQueries(query_two);
    let isomorphism = isomorphic(bgpOne, bgpTwo);
    console.log(isomorphism);
}

let query_one = `
PREFIX : <http://example.org/ns#>
select ?s where {
    ?s rdf:type :Person .
    ?s rdf:type :Something .
    ?s rdf:type :Student .
}
`
let query_two = `
PREFIX : <http://example.org/ns#>
select ?s where {
    ?s rdf:type :Person .
    ?p rdf:type :Student .
    ? rdf:type :Something .
}
`

function generateBGPQuadsFromQueries(query: string) {
    let parsedJSON = SPARQLParser.parse(query);
    let basicGraphPattern = parsedJSON.where[0].triples;
    let graph = convertToGraph(basicGraphPattern);
    return graph;
}

function convertToGraph(basicGraphPattern: any) {
    let graph: Quad[] = [];
    for (let i = 0; i < basicGraphPattern.length; i++) {
        let subject = basicGraphPattern[i].subject;
        let predicate = basicGraphPattern[i].predicate;
        let object = basicGraphPattern[i].object;
        if (subject.termType === 'Variable') {
            
            subject = factory.blankNode(subject.value);
            console.log(subject);
            
        }
        if (object.termType === 'Variable') {
            
            object = factory.blankNode(object.value);
        }
        if (predicate.termType === 'Variable') {
            console.log(predicate);
            
            predicate = factory.blankNode(predicate.value);
        }
        let quad = factory.quad(subject, predicate, object);
        graph.push(quad);
    }
    return graph;
}

main();
