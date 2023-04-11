import { RSPQLParser } from "../../parsers/RSPQLParser";

let simple_query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT AVG(?v) as ?avgTemp
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    WHERE{
        WINDOW :w1 { ?sensor :value ?v ; :measurement: ?m }
    }`;

let two_stream_query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT AVG(?v) as ?avgTemp
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    FROM NAMED WINDOW :w2 ON STREAM :stream2 [RANGE 15 STEP 5]
    WHERE{
        WINDOW :w1 { ?sensor :value ?v ; :measurement: ?m }
        WINDOW :w2 { ?sensor :value ?v ; :measurement: ?m }
    }`;
let dahcc_query = `
PREFIX saref: <https://saref.etsi.org/core/> 
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
PREFIX : <https://rsp.js/>
REGISTER RStream <output> AS
SELECT (AVG(?object) AS ?averageHR1)
FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant2/data/> [RANGE 10 STEP 2]
WHERE{
    WINDOW :w1 { ?subject saref:hasValue ?object .
                 ?subject saref:relatesToProperty dahccsensors:wearable.bvp .}
}
`;
describe("RSPQLParser", () => {
    it('parsing a simple one stream RSPQL query', () => {
        let parser = new RSPQLParser();
        let parsed = parser.parse(simple_query);
        expect(parsed.sparql.replace(/\s/g, '')).toBe(`PREFIX : <https://rsp.js/>
        SELECT AVG(?v) as ?avgTemp
        WHERE{
            GRAPH :w1 {?sensor :value ?v ; :measurement: ?m }
        }
        `.replace(/\s/g, ''));

        expect(parsed.r2s).toEqual({ operator: "RStream", name: "output" });
        expect(parsed.s2r[0]).toEqual({ window_name: "https://rsp.js/w1", stream_name: "https://rsp.js/stream1", width: 10, slide: 2 });
    });

    it('parsing a simple two stream RSPQL query', () => {
        let parser = new RSPQLParser();
        let parsed = parser.parse(two_stream_query);
        expect(parsed.sparql.replace(/\s/g, '')).toBe(`PREFIX : <https://rsp.js/>
        SELECT AVG(?v) as ?avgTemp
        WHERE{
            GRAPH :w1 {?sensor :value ?v ; :measurement: ?m }
            GRAPH :w2 {?sensor :value ?v ; :measurement: ?m }
        }
        `.replace(/\s/g, ''));
        expect(parsed.r2s).toEqual({ operator: "RStream", name: "output" });
        expect(parsed.s2r[0]).toEqual({ window_name: "https://rsp.js/w1", stream_name: "https://rsp.js/stream1", width: 10, slide: 2 });
        expect(parsed.s2r[1]).toEqual({ window_name: "https://rsp.js/w2", stream_name: "https://rsp.js/stream2", width: 15, slide: 5 });        
    });

    it('generate_sensor_name_from_query', () => {
        let parser = new RSPQLParser();
        let parsed = parser.parse(dahcc_query);
        parser.get_sensor_name(parsed);
    });

});