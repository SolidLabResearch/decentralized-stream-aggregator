import { DataFactory, Quad } from "rdf-data-factory";
import { BlankNode } from "n3";
import { isomorphic } from "rdf-isomorphic";
const sparqlParser = require('sparqljs').Parser;
const SPARQLParser = new sparqlParser();


let query_one = `
PREFIX rdf: <https://www.w3.org/1999/02/22-rdf-syntax-ns#> 
PREFIX : <http://rsp.js/> 
SELECT * WHERE {
    ?s rdf:type :Person .
    ?s rdf:type :Student .
}
`

let query_two = `
PREFIX rdf:<https://www.w3.org/1999/02/22-rdf-syntax-ns#> 
PREFIX : <http://rsp.js/> 
SELECT * WHERE {
?s rdf:type :Person .
?p rdf:type :Student .
}
`

function convert_to_graph(basic_graph_pattern: any) {
    let graph: Quad[] = [];
    for (let i = 0; i < basic_graph_pattern.length; i++) {
        let subject = basic_graph_pattern[i].subject;
        let predicate = basic_graph_pattern[i].predicate;
        let object = basic_graph_pattern[i].object;
        if (subject.termType === 'Variable') {
            subject = new BlankNode(subject);
        }
        if (object.termType === 'Variable') {
            object = new BlankNode(object);
        }
        let quad = new DataFactory().quad(subject, predicate, object);
        graph.push(quad);
    }
    return graph;
}

function generate_bgp_quads_from_query(query: string) {
    let sparql_parsed = SPARQLParser.parse(query);    
    let basic_graph_pattern = sparql_parsed.where[0].triples;
    let graph = convert_to_graph(basic_graph_pattern);
    return graph;
}

let quads_from_query_one = generate_bgp_quads_from_query(query_one);
let quads_from_query_two = generate_bgp_quads_from_query(query_two);

let bijection = isomorphic(convert_to_graph(quads_from_query_one), convert_to_graph(quads_from_query_two))

console.log(bijection);
