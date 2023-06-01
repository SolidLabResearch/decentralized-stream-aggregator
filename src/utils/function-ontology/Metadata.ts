const ldfetch = require('ldfetch');
const linked_data_fetch = new ldfetch();
const N3 = require('n3');
/**
 * Get the metadata of a LDP resource from the .meta file of the container the resource is in.
 * The response is a N3.Store object.
 * @export
 * @param {string} ldp_resource_location
 * @return {*} {Promise<Store>}
 */
export async function get_metadata_of_ldp_resource(ldp_resource_location: string): Promise<any> {
    let ldp_resource_container = ldp_resource_location.split('/').slice(0, -1).join('/');
    let ldp_resource_container_meta = ldp_resource_container + '/.meta';
    let response = await linked_data_fetch.get(ldp_resource_container_meta);
    let metadata_store = new N3.Store(response.triples);
    return metadata_store;
}

export function get_individual_events(aggregation_event_uri: string) {
    
}