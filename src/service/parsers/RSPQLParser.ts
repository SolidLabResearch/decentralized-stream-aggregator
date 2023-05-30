import { ParsedQuery } from "./ParsedQuery";
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
     *
     * @param {string} rspql_query
     * @return {*}  {ParsedQuery}
     * @memberof RSPQLParser
     */
    parse(rspql_query: string): ParsedQuery {
        let parsed = new ParsedQuery();
        let split = rspql_query.split(/\r?\n/);
        let sparqlLines = new Array<string>();
        let prefixMapper = new Map<string, string>();
        split.forEach((line) => {
            let trimmed_line = line.trim();
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
        let sparql_parsed = this.parse_sparql_query(parsed.sparql, parsed);
        return parsed;
    }

    /**
     * Unwraps a prefixed IRI to a full IRI.
     *
     * @param {string} prefixedIRI
     * @param {Map<string, string>} prefixMapper
     * @return {*} 
     * @memberof RSPQLParser
     */
    unwrap(prefixedIRI: string, prefixMapper: Map<string, string>) {
        if (prefixedIRI.trim().startsWith("<")) {
            return prefixedIRI.trim().slice(1, -1);
        }
        let split = prefixedIRI.trim().split(":");
        let iri = split[0];
        if (prefixMapper.has(iri)) {
            return prefixMapper.get(iri) + split[1];
        }
        else {
            return "";
        }
    }

    /**
     * Returns the name of the sensor from the SPARQL query.
    **/

    get_sensor_name(parsed_query: ParsedQuery) {
        console.log(parsed_query.sparql)
    }

    parse_sparql_query(sparqlQuery: string, parsed: ParsedQuery) {
        let parsed_sparql_query = this.sparql_parser.parse(sparqlQuery);
        let prefixes = parsed_sparql_query.prefixes;
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

