import { QueryRegistry } from "./QueryRegistry";
describe("QueryRegistry", () => {
    it("register_one_query_to_registry", () => {
        let query_registry = new QueryRegistry();
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
        expect(query_registry.add_query_in_registry(query_one)).toBeTruthy();
    })

    it("register_two_but_same_query_to_registry", () => {
        let query_registry = new QueryRegistry();
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
        expect(query_registry.add_query_in_registry(query_one)).toBeTruthy();
        expect(query_registry.add_query_in_registry(query_two)).toBeFalsy();
    });

    it("register_two_different_query_to_registry", () => {
        let query_registry = new QueryRegistry();
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
        expect(query_registry.add_query_in_registry(query_one)).toBeTruthy();
        expect(query_registry.add_query_in_registry(query_two)).toBeTruthy();
    });

    it("check_get_registeredQueries_function", () => {
        let query_registry = new QueryRegistry();
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
        query_registry.add_query_in_registry(query_one);
        query_registry.add_query_in_registry(query_two);
        expect(query_registry.get_registered_queries().size).toBe(2);
    });

    it("check_add_query_function", () => {
        let query_registry = new QueryRegistry();
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
        query_registry.add_to_executing_queries(query_one);
        query_registry.add_to_executing_queries(query_two);
        expect(query_registry.executing_queries.length).toBe(2);
    });

    it('check_if_the_query_is_already_registered', () => {
        let query_registry = new QueryRegistry();
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
        expect(query_registry.add_query_in_registry(query_one)).toBeTruthy();
        expect(query_registry.add_query_in_registry(query_two)).toBeTruthy();
        expect(query_registry.add_query_in_registry(query_one)).toBeFalsy();
    });

    it('get_exectuting_queries_function', () => {
        let query_registry = new QueryRegistry();
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
        query_registry.add_to_executing_queries(query_one);
        let executing_queries = query_registry.get_executing_queries();
        expect(executing_queries).toEqual([query_one]);
    })
});