const ld_fetch = require('ldfetch');
const ldfetch = new ld_fetch({});
const N3 = require('n3');

export class TypeIndexLDESLocator {

    public readonly pod_webid: string;
    public readonly pod_url: string;
    public readonly private_type_index: string;
    public readonly public_type_index: string;

    constructor(pod_url: string) {
        this.pod_url = pod_url;
        this.pod_webid = `${this.pod_url}/profile/card#me`;
        this.public_type_index = `${this.pod_url}/settings/publicTypeIndex`;
        this.private_type_index = `${this.pod_url}/settings/privateTypeIndex`;
    }

    public async getLDESStreamURL(metric: string) {
        try {
            const response = await ldfetch.get(this.public_type_index);
            let store = new N3.Store(response.triples);
            let quads = store.getQuads();
            for (let quad of quads) {
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
    

    public getPodWebId(): string {
        return this.pod_webid;
    }

    public getPodUrl(): string {
        return this.pod_url;
    }

    public getPrivateTypeIndex(): string {
        return this.private_type_index;
    }

    public getPublicTypeIndex(): string {
        return this.public_type_index;
    }
}
