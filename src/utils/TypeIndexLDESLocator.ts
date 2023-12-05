export class TypeIndexLDESLocator {

    public readonly pod_webid: string;
    public readonly pod_url: string;
    public readonly private_type_index: string;
    public readonly public_type_index: string;

    constructor(pod_url: string, metric_type: string, pod_webid: string) {
        this.pod_url = pod_url;
        this.pod_webid = `${this.pod_url}/profile/card#me`;
        this.private_type_index = `${this.pod_url}/private/${metric_type}.ttl`;
        this.public_type_index = `${this.pod_url}/public/${metric_type}.ttl`;

    }
}