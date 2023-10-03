// import { if_aggregated_events_exist } from "./ResultUtil";

// test('if_aggregated_events_exist', () => {
//     let query = `
//     PREFIX saref: <https://saref.etsi.org/core/> 
//     PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
//     PREFIX : <https://rsp.js/>
//     REGISTER RStream <output> AS
//     SELECT (AVG(?o) AS ?averageHR1)
//     FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 120 STEP 20]
//     WHERE{
//         WINDOW :w1 { ?s saref:hasValue ?o .
//                      ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
//     }  
//     `
//     console.log(if_aggregated_events_exist(query));
// });