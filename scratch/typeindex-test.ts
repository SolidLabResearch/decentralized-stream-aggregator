import {LDPCommunication} from "@treecg/versionawareldesinldp";
const communication = new LDPCommunication();
const pod_location = "http://n061-14a.wall2.ilabt.iminds.be:3000/participant6/";

// communication.get(pod_location).then(async(response) => {
//     const stream = response.text();
//     console.log(await stream);
    
// });

// communication.put(pod_location + "settings/publicTypeIndex", `@prefix dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/> .
// @prefix ldes: <https://w3id.org/ldes#> .
// @prefix saref: <https://w3id.org/saref#> .
// @prefix solid: <http://www.w3.org/ns/solid/terms#> .
// @prefix tree: <https://w3id.org/tree#> .
// @prefix type: <https://www.w3.org/ns/type-index#> .

// <#bvpDataset> a ldes:EventStream ;
//    ldes:timestampPath saref:hasTimestamp ;
//    tree:shape <http://n061-14a.wall2.ilabt.iminds.be:3000/participant6/public/bvpEventTemplate.shacl> ;
//    tree:view <http://n061-14a.wall2.ilabt.iminds.be:3000/participant6/bvp/> .
// `).then(async(response) => {
//     const stream = response.text();
//     console.log(await stream);
// });

let body = `INSERT DATA {<http://n061-14a.wall2.ilabt.iminds.be:3000/participant6/profile/card#> <http://www.w3.org/ns/solid/terms#publicTypeIndex> <http://n061-14a.wall2.ilabt.iminds.be:3000/participant6/settings/publicTypeIndex> . }`;

// let body = `INSERT DATA {<#bvpDataset> <https://saref.etsi.org/core/relatesToProperty> <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/wearable.bvp>}`

communication.patch(pod_location + "settings/publicTypeIndex", body).then(async(response) => {
    const stream = response.text();
    console.log(await stream);
});

