import { LDESinLDP, LDPCommunication } from "@treecg/versionawareldesinldp";
const aggregation_location = "http://localhost:3000/aggregation_pod/aggregation_new/";

async function main(aggregation_location: string) {
    const communication = new LDPCommunication();
    let etag_map = new Map();
    const ldes_in_ldp = new LDESinLDP(aggregation_location, communication);
    const LDP_Contains = "http://www.w3.org/ns/ldp#contains";
    const page = await ldes_in_ldp.readMetadata();

    let container = [];
    for (const quad of page) {
        if (quad.predicate.value == LDP_Contains) {
            container.push(quad.object.value);
        }
    }
    for (const item of container) {
        fetch(item, {
            method: 'HEAD',
        }).then((response: any) => {
            saveETag(item, response.headers.get('etag'), etag_map);
        }).finally(() => {
            let previous_etag = getETag(item, etag_map);
            console.log(previous_etag);

        })
    }
}

function saveETag(item: string, etag: string, etag_map: Map<string, string>) {
    etag_map.set(item, etag);
    console.log(etag_map);

}

function getETag(item: string, etag_map: Map<string, string>) {
    return etag_map.get(item);
}

main(aggregation_location);