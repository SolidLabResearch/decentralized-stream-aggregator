import { RSPQLParser, ParsedQuery } from "./RSPQLParser";
const SparqlParser = require('sparqljs').Parser;
const sparql_parser = new SparqlParser();
/**
 * Class for extracting the focus of the query.
 * @class AggregationFocusExtractor
 */
export class AggregationFocusExtractor {
    public query: string;
    public parser: RSPQLParser;
    public focus_predicates: string[];
    // TODO add the type for focus_of_query
    public focus_of_query: any;

    /**
     * Creates an instance of AggregationFocusExtractor.
     * @param {string} rspql_query - The RSPQL query from where the focus has to be extracted.
     * @memberof AggregationFocusExtractor
     */
    constructor(rspql_query: string) {
        this.query = rspql_query;
        this.parser = new RSPQLParser();
        // Example focus predicates which can or should be changed.
        this.focus_predicates = ['https://saref.etsi.org/core/relatesToProperty', 'https://www.w3.org/2000/01/rdf-schema#range'];
        this.focus_of_query = {};
    }

    /**
     * Extracts the focus of the query by parsing the query and looking for the 
     * predefined focus predicates.
     * @returns {any} - The focus of the query.
     * @memberof AggregationFocusExtractor
     */
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
    /**
     * Adds a predicate value to the focus of the query.
     * @param {*} predicate_value - The value of the predicate.
     * @param {number} counter - The counter to be used for the focus name (as there can be more than one focuses).
     * @memberof AggregationFocusExtractor
     */
    public add_to_focus_of_query(predicate_value: any, counter: number) {
        this.focus_of_query["focus_" + counter] = predicate_value;
    }

}