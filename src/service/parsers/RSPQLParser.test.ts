import { RSPQLParser } from "./RSPQLParser";

describe('RSPQLParser', () => {

    let parser: RSPQLParser;

    beforeEach(() => {
        parser = new RSPQLParser();
    });

    const rspql_query = `
    PREFIX saref: <https://saref.etsi.org/core/>
    PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
    PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT (MAX(?o) as ?maxSKT)
    FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/> [RANGE 180000 STEP 30000]
    WHERE {
        WINDOW :w1 {
            ?s saref:hasValue ?o .
            ?s saref:relatesToProperty dahccsensors:wearable.skt .
        }   
    }
    `;
    it('should_parse_the_rspql_query', () => {
        const parsed_query = parser.parse(rspql_query);
        expect(parsed_query).toBeDefined();
        expect(parsed_query.sparql).toBe('\n' +
            'PREFIX saref: <https://saref.etsi.org/core/>\n' +
            'PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>\n' +
            'PREFIX : <https://rsp.js/>\n' +
            'SELECT (MAX(?o) as ?maxSKT)\n' +
            'WHERE {\n' +
            'GRAPH :w1 {\n' +
            '?s saref:hasValue ?o .\n' +
            '?s saref:relatesToProperty dahccsensors:wearable.skt .\n' +
            '}\n' +
            '}\n')
        expect(parsed_query.r2s).toEqual({ operator: 'RStream', name: 'output' });
        expect(parsed_query.s2r).toEqual([{ window_name: 'https://rsp.js/w1', stream_name: 'http://localhost:3000/', width: 180000, slide: 30000 }]);
        expect(parsed_query.aggregation_function).toBe('max');
        expect(parsed_query.projection_variables[0]).toBe('maxSKT');
        expect(parsed_query.aggregation_thing_in_context.length).toBe(0);
        expect(parsed_query.prefixes.size).toBe(3);
    });

    it('should_unwrap_the_prefixed_iri', () => {
        const prefixMapper = new Map<string, string>();
        prefixMapper.set('saref', 'https://saref.etsi.org/core/');
        prefixMapper.set('dahccsensors', 'https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/');
        const unwrapped = parser.unwrap('saref:hasValue', prefixMapper);
        expect(unwrapped).toBe('https://saref.etsi.org/core/hasValue');
    });

    it('should_unwrap_the_full_iri', () => {
        const prefixMapper = new Map<string, string>();
        const unwrapped = parser.unwrap('<https://saref.etsi.org/core/hasValue>', prefixMapper);
        expect(unwrapped).toBe('https://saref.etsi.org/core/hasValue');
    });
    
});