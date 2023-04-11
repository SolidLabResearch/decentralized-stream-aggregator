import { isomorphic } from "rdf-isomorphic";
import { DataFactory, Quad } from "rdf-data-factory";
import { BlankNode } from "n3";
let sparqlParser = require('sparqljs').Parser;
let SPARQLParser = new sparqlParser();

async function main() {
    let bgpOne = generateBGPQuadsFromQueries(query_one);
    let bgpTwo = generateBGPQuadsFromQueries(query_two);
    let isomorphism = isomorphic(bgpOne, bgpTwo);
    console.log(isomorphism);
}

let query_one = `
select ?s ?p where {
    ?s ?p ?o .
}
`
let query_two = `
select distinct ?x where {
    ?x ?y ?z .
    filter (?y = <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>)
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
            subject = new BlankNode(subject);
        }
        if (object.termType === 'Variable') {
            object = new BlankNode(object);
        }
        if (predicate.termType === 'Variable') {
            predicate = new BlankNode(predicate);
        }
        let quad = new DataFactory().quad(subject, predicate, object);
        graph.push(quad);
    }
    return graph;
}


main();
