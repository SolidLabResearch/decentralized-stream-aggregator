const { Parser: SparqlParser } = require('sparqljs');
export class RSPQLParser {
    r2s: Map<string, string> = new Map<string, string>();
    s2r: Array<string> = new Array<string>();
    sparql_parser: typeof SparqlParser;
    constructor() {
        this.sparql_parser = new SparqlParser();
    }
    /**
     * Parse a RSPQL query to a parsedQuery Object containing the R2S and S2R mappings along with the SPARQL query.
     * @param {string} rspql_query - The RSPQL query to be parsed.
     * @returns {ParsedQuery} - The parsed query object.
     * @memberof RSPQLParser
     */
    parse(rspql_query: string): ParsedQuery {
        const parsed = new ParsedQuery();
        const split = rspql_query.split(/\r?\n/);
        const sparqlLines = new Array<string>();
        const prefixMapper = new Map<string, string>();
        split.forEach((line) => {
            const trimmed_line = line.trim();
            if (trimmed_line.startsWith("REGISTER")) {
                const regexp = /REGISTER +([^ ]+) +<([^>]+)> AS/g;
                const matches = trimmed_line.matchAll(regexp);
                for (const match of matches) {
                    if (match[1] === "RStream" || match[1] === "DStream" || match[1] === "IStream") {
                        parsed.set_r2s({ operator: match[1], name: match[2] });
                    }
                }
            }
            else if (trimmed_line.startsWith("FROM NAMED WINDOW")) {
                const regexp = /FROM +NAMED +WINDOW +([^ ]+) +ON +STREAM +([^ ]+) +\[RANGE +([^ ]+) +STEP +([^ ]+)\]/g;
                const matches = trimmed_line.matchAll(regexp);
                for (const match of matches) {
                    parsed.add_s2r({
                        window_name: this.unwrap(match[1], prefixMapper),
                        stream_name: this.unwrap(match[2], prefixMapper),
                        width: Number(match[3]),
                        slide: Number(match[4])
                    });
                }
            } else {
                let sparqlLine = trimmed_line;
                if (sparqlLine.startsWith("WINDOW")) {
                    sparqlLine = sparqlLine.replace("WINDOW", "GRAPH");
                }
                if (sparqlLine.startsWith("PREFIX")) {
                    const regexp = /PREFIX +([^:]*): +<([^>]+)>/g;
                    const matches = trimmed_line.matchAll(regexp);
                    for (const match of matches) {
                        prefixMapper.set(match[1], match[2]);
                    }
                }
                sparqlLines.push(sparqlLine);
            }
        });
        parsed.sparql = sparqlLines.join("\n");
        return parsed;
    }

    /**
     * Unwraps a prefixed IRI to a full IRI.
     * @param {string} prefixedIRI - The prefixed IRI to be unwrapped.
     * @param {Map<string, string>} prefixMapper - The prefix mapper to be used for unwrapping.
     * @returns {string} - The unwrapped IRI. - The unwrapped IRI.
     * @memberof RSPQLParser
     */
    unwrap(prefixedIRI: string, prefixMapper: Map<string, string>) {
        if (prefixedIRI.trim().startsWith("<")) {
            return prefixedIRI.trim().slice(1, -1);
        }
        const split = prefixedIRI.trim().split(":");
        const iri = split[0];
        if (prefixMapper.has(iri)) {
            return prefixMapper.get(iri) + split[1];
        }
        else {
            return "";
        }
    }
    
    parse_sparql_query(sparqlQuery: string, parsed: ParsedQuery) {
        const parsed_sparql_query = this.sparql_parser.parse(sparqlQuery);
        const prefixes = parsed_sparql_query.prefixes;
        Object.keys(prefixes).forEach((key) => {
            parsed.prefixes.set(key, prefixes[key]);
        });
        for (let i = 0; i <= parsed_sparql_query.variables.length; i++) {
            if (parsed_sparql_query.variables[i] !== undefined) {
                parsed.projection_variables.push(parsed_sparql_query.variables[i].variable.value);
                parsed.aggregation_function = parsed_sparql_query.variables[i].expression.aggregation;
            }
        }
    }
}

export class ParsedQuery {
    public prefixes: Map<string, string>;
    public aggregation_thing_in_context: Array<string>;
    public projection_variables: Array<string>;
    public aggregation_function: string;
    public sparql: string;
    public r2s: R2S;
    public s2r: Array<WindowDefinition>;
    constructor() {
        this.sparql = "Select * WHERE{?s ?p ?o}";
        this.r2s = { operator: "RStream", name: "undefined" };
        this.s2r = new Array<WindowDefinition>();
        this.prefixes = new Map<string, string>();
        this.aggregation_thing_in_context = new Array<string>();
        this.projection_variables = new Array<string>();
        this.aggregation_function = "";
    }
    set_sparql(sparql: string) {
        this.sparql = sparql;
    }
    set_r2s(r2s: R2S) {
        this.r2s = r2s;
    }
    add_s2r(s2r: WindowDefinition) {
        this.s2r.push(s2r);
    }
}

export type WindowDefinition = {
    window_name: string,
    stream_name: string,
    width: number,
    slide: number
}
type R2S = {
    operator: "RStream" | "IStream" | "DStream",
    name: string
}


