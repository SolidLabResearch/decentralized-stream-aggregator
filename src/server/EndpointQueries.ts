
export class EndpointQueries {
    get_query(name: string, from_timestamp: Date, to_timestamp: Date) {
        let from = Date.parse(from_timestamp.toString())
        let to = Date.parse(to_timestamp.toString())
        let difference_seconds = (to - from) / 1000;        
        if (name = "averageHRPatient1") {
            return `
                    PREFIX saref: <https://saref.etsi.org/core/> 
                    PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
                    PREFIX : <https://rsp.js/>
                    REGISTER RStream <output> AS
                    SELECT (AVG(?o) AS ?averageHR1)
                    FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE ${difference_seconds} STEP 20]
                    WHERE{
                        WINDOW :w1 { ?s saref:hasValue ?o .
                                     ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
                    }                     
            `;
        }
        else if (name = "averageHRPatient2") {
            return `
        PREFIX saref: <https://saref.etsi.org/core/>
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        PREFIX : <https://rsp.js/>
        REGISTER RStream <output> AS
        SELECT (AVG(?o) AS ?averageHR2)
        FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant2/data/> [RANGE ${difference_seconds} STEP 20]
        WHERE{
            WINDOW :w1 { ?s saref:hasValue ?o .
                            ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
        }`;
        }
    }
}
