export class RSPQLParser {
    rspqlQuery: string;
    r2s: Map<string, string> = new Map<string, string>();
    s2r: Array<string> = new Array<string>();
    constructor(query: string) {
        this.rspqlQuery = query;
    }

    parse(): ParsedQuery {
        let parsed = new ParsedQuery();
        let split = this.rspqlQuery.split(/\r?\n/);
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
        return parsed;
    }

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
}

export class ParsedQuery {
    sparql: string;
    r2s: R2S;
    s2r: Array<WindowDefinition>;
    constructor() {
        this.sparql = "Select * WHERE{?s ?p ?o}";
        // @ts-ignore
        this.r2s = { operator: "RStream", name: "undefined" };
        this.s2r = new Array<WindowDefinition>();

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