const ld_fetch = require('ldfetch');
const ldfetch = new ld_fetch({});
const N3 = require('n3');

/**
 * Class for fetching the LDES stream URL from the type index.
 * @class TypeIndexLDESLocator
 */
export class TypeIndexLDESLocator {

    public readonly pod_webid: string;
    public readonly pod_url: string;
    public readonly private_type_index: string;
    public readonly public_type_index: string;

    /**
     * Creates an instance of TypeIndexLDESLocator.
     * @param {string} pod_url - The URL of the pod.
     * @memberof TypeIndexLDESLocator
     */
    constructor(pod_url: string) {
        this.pod_url = pod_url;
        this.pod_webid = `${this.pod_url}/profile/card#me`;
        this.public_type_index = `${this.pod_url}/settings/publicTypeIndex`;
        this.private_type_index = `${this.pod_url}/settings/privateTypeIndex`;
    }

    /**
     * Fetches the LDES stream URL from the public type index.
     * @param {string} metric - The metric to fetch the LDES stream URL for.
     * @returns {Promise<string | null>} - The LDES stream URL.
     * @memberof TypeIndexLDESLocator
     */
    public async getLDESStreamURL(metric: string): Promise<string | null> {
        try {
            const response = await ldfetch.get(this.public_type_index);
            const store = new N3.Store(response.triples);
            const quads = store.getQuads();
            const relevant_ldes_metric = metric;
            for (const quad of quads) {
                if (quad.predicate.value === 'https://saref.etsi.org/core/relatesToProperty') {
                    if (quad.object.value === relevant_ldes_metric) {
                        return quad.subject.value;
                    }
                }
            }
            for (const quad of quads) {
                if (quad.predicate.value === 'https://saref.etsi.org/core/relatesToProperty') {
                    continue;
                }
                if (quad.predicate.value === 'https://w3id.org/tree#view') {
                    return quad.object.value;
                }
            }
            return null;
        } catch (error) {
            console.error("Error fetching data:", error);
            return null;
        }
    }


    /**
     * Returns the pod WebID.
     * @returns {string} - The WEBID of the pod.
     * @memberof TypeIndexLDESLocator
     */
    public getPodWebId(): string {
        return this.pod_webid;
    }

    /**
     * Returns the pod URL.
     * @returns {string} - The pod URL.
     * @memberof TypeIndexLDESLocator
     */
    public getPodUrl(): string {
        return this.pod_url;
    }

    /**
     * Returns the private type index URL.
     * @returns {string} - The private type index URL.
     * @memberof TypeIndexLDESLocator
     */
    public getPrivateTypeIndex(): string {
        return this.private_type_index;
    }

    /**
     * Returns the public type index URL.
     * @returns {string} - The public type index URL.  
     * @memberof TypeIndexLDESLocator
     */
    public getPublicTypeIndex(): string {
        return this.public_type_index;
    }
}
