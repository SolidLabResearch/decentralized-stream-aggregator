export class EndpointQueries {
    query_map: Map<string, string> = new Map<string, string>();
    constructor(latest_minutes_to_retrieve: number) {
        this.add_endpoint_queries_to_map(latest_minutes_to_retrieve);
    }

    add_query(query_name: string, query: string) {
        this.query_map.set(query_name, query);
    }

    get_query(query_name: string) {
        return this.query_map.get(query_name);
    }

    add_endpoint_queries_to_map(latest_minutes_to_retrieve: number) {
        this.add_query("averageHRPatient1", `
        PREFIX saref: <https://saref.etsi.org/core/> 
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?o) AS ?averageHR1)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE ${latest_minutes_to_retrieve * 60} STEP 20]
        WHERE{
            WINDOW :w1 { ?s saref:hasValue ?o .
                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }
        `)

        this.add_query("averageHRPatient2", `
        PREFIX saref: <https://saref.etsi.org/core/>
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?o) AS ?averageHR2)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant2/data/> [RANGE ${latest_minutes_to_retrieve * 60} STEP 20]
        WHERE{
            WINDOW :w1 { ?s saref:hasValue ?o .
                            ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }`);
    }
}

