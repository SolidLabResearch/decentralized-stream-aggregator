import { SPARQLToRSPQL } from "../../parsers/SPARQLToRSPQL";

describe("parsing_sparql_to_rspql", () => {
    test("parsing_sparql_to_rspql", async () => {
        const sparqlToRSPQL = new SPARQLToRSPQL();
        expect(sparqlToRSPQL).toBeInstanceOf(SPARQLToRSPQL);
    });
 });

 //TODO : add more tests which work.