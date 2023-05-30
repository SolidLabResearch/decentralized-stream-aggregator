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
