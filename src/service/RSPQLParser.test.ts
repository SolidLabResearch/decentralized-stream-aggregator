import { RSPQLParser } from "./RSPQLParser";

let simple_query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT AVG(?v) as ?avgTemp
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    WHERE{
        WINDOW :w1 { ?sensor :value ?v ; :measurement: ?m }
    }`;
describe("RSPQLParser", () => {
    it('parsing a simple one stream RSPQL query', () => {
        let query = simple_query;
        let parser = new RSPQLParser();
        let sparqlQuery = parser.parse(query);
    });
});