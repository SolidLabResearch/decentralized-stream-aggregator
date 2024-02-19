import { RSPQLParser, ParsedQuery } from "./RSPQLParser";
const SparqlParser = require('sparqljs').Parser;
const sparql_parser = new SparqlParser();
export class AggregationFocusExtractor {

    public query: string;
    public parser: RSPQLParser;
    public focus_predicates: string[];
    // TODO add the type for focus_of_query
    public focus_of_query: any;

    constructor(rspql_query: string) {
        this.query = rspql_query;
        this.parser = new RSPQLParser();
        this.focus_predicates = ['https://saref.etsi.org/core/relatesToProperty', 'https://www.w3.org/2000/01/rdf-schema#range'];
        this.focus_of_query = {};
    }


    public extract_focus(): any {
        const parsed_query: ParsedQuery = this.parser.parse(this.query);
        const sparql_query = parsed_query.sparql;
        const sparql_query_parsed = sparql_parser.parse(sparql_query);
        for (let bgp_counter = 0; bgp_counter < sparql_query_parsed.where.length; bgp_counter++) {
            for (let graph_counter = 0; graph_counter < sparql_query_parsed.where[bgp_counter].patterns.length; graph_counter++) {
                sparql_query_parsed.where[bgp_counter].patterns[graph_counter].triples.forEach((triple: any) => {
                    if (triple.predicate.termType == 'NamedNode' && this.focus_predicates.includes(triple.predicate.value)) {
                        const focus_name = 'focus_' + (Object.keys(this.focus_of_query).length + 1);
                        this.focus_of_query[focus_name] = triple.object.value;
                    }
                });
            }
        }
        return this.focus_of_query;
    }

    public add_to_focus_of_query(predicate_value: any, counter: number) {
        this.focus_of_query["focus_" + counter] = predicate_value;
    }

}