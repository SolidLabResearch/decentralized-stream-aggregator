import { RSPQLParser } from "../service/parsers/RSPQLParser";

const query = `
PREFIX saref: <https://saref.etsi.org/core/> 
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
PREFIX : <https://rsp.js/>
REGISTER RStream <output> AS
SELECT (AVG(?o) AS ?averageHR1)
FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 20 STEP 20]
FROM NAMED WINDOW :w2 ON STREAM <http://localhost:3000/dataset_participant2/data/> [RANGE 20 STEP 20]
WHERE{
    WINDOW :w1 { ?s saref:hasValue ?o .
                 ?s saref:relatesToProperty dahccsensors:wearable.bvp .}

    WINDOW :w2 { ?s saref:hasValue ?o . 
                    ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
}
`;

const parser = new RSPQLParser();
const parsed = parser.parse(query);
console.log(parsed.s2r.length);
