import { ParsedQuery } from "./ParsedQuery";
import { RSPQLParser } from "./RSPQLParser";
const SparqlParser = require('sparqljs').Parser;
const sparql_parser = new SparqlParser();
export class AggregationFocusExtractor {

    public query: string;
    public parser: RSPQLParser;
    public focus_predicates: string[];
    public focus_of_query: any;

    constructor(rspql_query: string) {
        this.query = rspql_query;
        this.parser = new RSPQLParser();
        this.focus_predicates = ['https://saref.etsi.org/core/relatesToProperty', 'https://www.w3.org/2000/01/rdf-schema#range'];
        this.focus_of_query = {};
    }

    public extract_focus(): any {
        let parsed_query: ParsedQuery = this.parser.parse(this.query);
        let sparql_query = parsed_query.sparql;
        let sparql_query_parsed = sparql_parser.parse(sparql_query);
        // console.log(sparql_query_parsed.where.length);
        // console.log(sparql_query_parsed.where.patterns);
        for (let bgp_counter = 0; bgp_counter < sparql_query_parsed.where.length; bgp_counter++) {
            let extracted_triples_from_query = sparql_query_parsed.where[bgp_counter].triples;
            console.log(extracted_triples_from_query);
            
            // for (let graph_counter = 0; graph_counter < sparql_query_parsed.where.patterns; graph_counter++){
            //     let extracted_triples_from_query = sparql_query_parsed.where[bgp_counter].patterns[graph_counter].triples;
            //     let triple_counter = 0;
            //     for (let triple of extracted_triples_from_query) {
            //         if (triple.predicate.termType == 'NamedNode' && this.focus_predicates.includes(triple.predicate.value)) {
            //             triple_counter++;
            //             this.add_to_focus_of_query(triple.object.value, triple_counter);
            //             console.log(triple.predicate.value);
            //             console.log(this.focus_of_query);
            //             return this.focus_of_query;
            //         }
            //     }
            // }
        }
    }

    public add_to_focus_of_query(predicate_value: any, counter: number) {
        this.focus_of_query['focus_' + counter] = predicate_value;
    }

}