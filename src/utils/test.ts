// // import { LDESinLDP, LDPCommunication } from "@treecg/versionawareldesinldp";
// // import { quick_sort_queue, StreamEventQueue } from "./StreamEventQueue";
// // import { QuadWithID } from "./Types";
// // let location_ldes = "http://localhost:3000/dataset_participant1/data/";

// // import { MaterializedViewRetriever } from "../service/aggregator/MaterializedViewRetriever";

// // async function main() {
// //     let queue = new StreamEventQueue<QuadWithID>([]);
// //     let ldes = new LDESinLDP(location_ldes, new LDPCommunication());
// //     let stream = await ldes.readMembersSorted();
// //     stream.on("data", (quad) => {
// //         queue.enqueue(quad, Date.now());
// //     });
// //     stream.on("end", () => {
// //         let sorted_queue = quick_sort_queue(queue);
// //         for (let i = 0; i < sorted_queue.size(); i++) {
// //             let element = sorted_queue.dequeue();
// //             if (element !== undefined) {
// //                 console.log(element.quads[4].object.value);
// //             }
// //         }
// //     });
// // }

// // main();

// // async function test() {
// //     let queue = new StreamEventQueue<string>([]);
// //     for (let i = 0; i < 10; i++) {
// //         queue.enqueue("test" + i, Math.random() * 100);
// //     }
// //     let sorted_queue = quick_sort_queue(queue);
// //     console.log(sorted_queue)
// // }

// // // test();

// // //  can make a buffer size and after that you push to RSP and then you start listening only to the new events


// async function test() {
//     let query = `
//     PREFIX saref: <https://saref.etsi.org/core/>
//     PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
//     PREFIX : <https://rsp.js/>
//     REGISTER RStream <output> AS
//     SELECT (AVG(?o) AS ?averageHR2)
//     FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant2/data/> [RANGE 180 STEP 20]
//     FROM NAMED WINDOW :w2 ON STREAM <http://localhost:3000/dataset_participant2/data/> [RANGE 180 STEP 20]
//     FROM NAMED WINDOW :w3 ON STREAM <http://localhost:3000/dataset_participant3/data/> [RANGE 180 STEP 20]
    
//     WHERE{
//         WINDOW :w1 { ?s saref:hasValue ?o .
//                         ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
//     }
//     `;
//     let retriever = new MaterializedViewRetriever(query);
//     retriever.retrieveViewStream();
// }

// test();