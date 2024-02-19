import { LDPCommunication } from "@treecg/versionawareldesinldp";

const communication = new LDPCommunication();

/**
 *
 * @param pod_location
 */
export async function createPublicTypeIndex(pod_location: string) {
    const body = `INSERT DATA {${pod_location}profile/card#> <http://www.w3.org/ns/solid/terms#publicTypeIndex> ${pod_location}settings/publicTypeIndex> . }`;
    communication.patch(pod_location + 'settings/publicTypeIndex', body).then(async (response) => {
        console.log(`Response: ${response.status} ${response.statusText}`);
        console.log(`Public type index created at ${pod_location}settings/publicTypeIndex`);
    })
}

/**
 *
 * @param pod_location
 * @param ldes_location
 * @param sensor_metric
 */
export async function addStreamToPublicTypeIndex(pod_location: string, ldes_location: string, sensor_metric: string) {
    communication.put(pod_location + "settings/publicTypeIndex", `
    @prefix dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/> .
    @prefix ldes: <https://w3id.org/ldes#> .
    @prefix saref: <https://w3id.org/saref#> .
    @prefix solid: <http://www.w3.org/ns/solid/terms#> .
    @prefix tree: <https://w3id.org/tree#> .
    @prefix type: <https://www.w3.org/ns/type-index#> .

    <#bvpDataset> a ldes:EventStream ;
       tree:path saref:hasTimestamp ;
       saref:relatesToProperty dahccsensors:${sensor_metric} ;
       tree:shape <${ldes_location}public/bvpEventTemplate.shacl> ;
       tree:view <${ldes_location}> .
    `).then(async (response) => {
        console.log(`Response: ${response.status} ${response.statusText}`);
        console.log(`Stream added to ${pod_location}settings/publicTypeIndex`);
    });
}

/**
 *
 * @param pod_location
 * @param tree_path
 * @param type
 */
export async function addPropertyToPublicTypeIndex(pod_location: string, tree_path: string, type: string) {
    communication.patch(pod_location + "settings/publicTypeIndex", `INSERT DATA {<#bvpDataset> <${tree_path}> <${type}>}`).then(async (response) => {
        console.log(`Response: ${response.status} ${response.statusText}`);
        console.log(`Type ${type} with Property ${tree_path} added to ${pod_location}settings/publicTypeIndex`);
    });
}