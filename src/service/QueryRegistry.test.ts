import { QueryRegistry } from "./QueryRegistry";
import { RSPQLParser } from "./RSPQLParser";
describe("QueryRegistry", () => {
    it("register_one_query_to_registry", () => {
        let queryRegistry = new QueryRegistry();
        let query_one = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?o) AS ?averageHR1)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasValue ?o .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `
        expect(queryRegistry.registerQuery(query_one)).toBeTruthy();
    })

    it("register_two_but_same_query_to_registry", () => {
        let queryRegistry = new QueryRegistry();
        let query_one = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?o) AS ?averageHR1)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasValue ?o .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `
        let query_two = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?o) AS ?averageHR1)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasValue ?o .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `
        expect(queryRegistry.registerQuery(query_one)).toBeTruthy();
        expect(queryRegistry.registerQuery(query_two)).toBeFalsy();
    });

    it("register_two_different_query_to_registry", () => {
        let queryRegistry = new QueryRegistry();
        let query_one = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?o) AS ?averageHR1)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasValue ?o .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `
        let query_two = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?timestamp) AS ?averageTimestamp)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant2/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasTimestamp ?timestamp .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `
        expect(queryRegistry.registerQuery(query_one)).toBeTruthy();
        expect(queryRegistry.registerQuery(query_two)).toBeTruthy();
    });

    it("check_get_registeredQueries_function", () => {
        let queryRegistry = new QueryRegistry();
        let query_one = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?o) AS ?averageHR1)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasValue ?o .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `
        let query_two = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?timestamp) AS ?averageTimestamp)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant2/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasTimestamp ?timestamp .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `
        queryRegistry.registerQuery(query_one);
        queryRegistry.registerQuery(query_two);
        expect(queryRegistry.getRegisteredQueries().size).toBe(2);
    });

    it("check_add_query_function", () => {
        let queryRegistry = new QueryRegistry();
        let query_one = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?o) AS ?averageHR1)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasValue ?o .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `
        let query_two = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?timestamp) AS ?averageTimestamp)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant2/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasTimestamp ?timestamp .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `
        queryRegistry.add(query_one);
        queryRegistry.add(query_two);
        expect(queryRegistry.executingQueries.length).toBe(2);
    });

    it("check_convert_to_graph_function", () => {
        let queryRegistry = new QueryRegistry();
        let sparqlParser = require('sparqljs').Parser;
        let SPARQLParser = new sparqlParser();
        let basic_sparql_query = `
        PREFIX saref: <http://saref.etsi.org/> 
        PREFIX dahccsensors: <http://example.org/> 
        PREFIX : <http://rsp.org/> 
        SELECT (AVG(?o) AS ?averageHR1)
        WHERE{
            ?s saref:hasValue ?o .
        }   `;
        let parsed_sparql_query = SPARQLParser.parse(basic_sparql_query);
        let basicGraphPattern = parsed_sparql_query.where[0].triples;
        let graph = queryRegistry.convertToGraph(basicGraphPattern);
        expect(graph.length).toBe(1);
    });

    it("check_the_isomorphic_query_function", () => {
        let queryRegistry = new QueryRegistry();
        let sparqlParser = require('sparqljs').Parser;
        let SPARQLParser = new sparqlParser();
        let basic_sparql_query_one = `
        PREFIX saref: <http://saref.etsi.org/> 
        PREFIX dahccsensors: <http://example.org/> 
        PREFIX : <http://rsp.org/> 
        SELECT (AVG(?o) AS ?averageHR1)
        WHERE{
            ?s saref:hasValue ?o .
        }   `;

        let basic_sparql_query_two = `
        PREFIX saref: <http://saref.etsi.org/> 
        PREFIX dahccsensors: <http://example.org/> 
        PREFIX : <http://rsp.org/> 
        SELECT (AVG(?object) AS ?averageHR1)
        WHERE{
            ?subject saref:hasValue ?object .
        }   `;

        let parsed_sparql_query_one = SPARQLParser.parse(basic_sparql_query_one);
        let parsed_sparql_query_two = SPARQLParser.parse(basic_sparql_query_two);
        let basicGraphPattern_one = parsed_sparql_query_one.where[0].triples;
        let basicGraphPattern_two = parsed_sparql_query_two.where[0].triples;
        let graph_one = queryRegistry.convertToGraph(basicGraphPattern_one);
        let graph_two = queryRegistry.convertToGraph(basicGraphPattern_two);
        expect(queryRegistry.checkIfQueriesAreIsomorphic(graph_one, graph_two)).toBeTruthy();
    });

    it("check_if_stream_parameters_are_equal", () => {
        let rspqlParser = new RSPQLParser();
        let queryRegistry = new QueryRegistry();
        let query_one = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?o) AS ?averageHR1)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasValue ?o .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `
        let query_two = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?timestamp) AS ?averageTimestamp)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant2/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasTimestamp ?timestamp .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `
        expect(queryRegistry.checkIfStreamParametersAreEqual(query_one, query_two)).toBeFalsy();
    });

    it('check_if_the_query_is_already_registered', () => {
        let queryRegistry = new QueryRegistry();
        let query_one = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?o) AS ?averageHR1)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasValue ?o .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `
        let query_two = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?timestamp) AS ?averageTimestamp)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant2/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasTimestamp ?timestamp .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `;
        expect(queryRegistry.registerQuery(query_one)).toBeTruthy();
        expect(queryRegistry.registerQuery(query_two)).toBeTruthy();
        expect(queryRegistry.registerQuery(query_one)).toBeFalsy();
    });

    it('check_if_window_parameters_are_equal', () => {
        let queryRegistry = new QueryRegistry();
        let query_one = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?o) AS ?averageHR1)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasValue ?o .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `

        let query_two = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?o) AS ?averageHR1)
        FROM NAMED WINDOW :w2 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w2 { ?s saref:hasValue ?o .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }`

        expect(queryRegistry.checkIfWindowParametersAreEqual(query_one, query_two)).toBeFalsy();

    })

    it('check_get_window_size_and_range_function', () => {
        let queryRegistry = new QueryRegistry();
        let query_one = `  
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?o) AS ?averageHR1)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
        WHERE{
            WINDOW :w1 { ?s saref:hasValue ?o .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `;
        expect(queryRegistry.getWindowWidthAndSlide(query_one)).toEqual({window_width: 10, window_slide: 2});
    });

});