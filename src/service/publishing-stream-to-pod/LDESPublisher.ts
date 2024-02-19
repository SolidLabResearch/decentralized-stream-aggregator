import {
    LDESinLDP,
    LDPCommunication,
    RDF,
    LDES,
    LDESConfig,
    VersionAwareLDESinLDP,
    ILDES,
    getAuthenticatedSession,
    VLILConfig
} from "@treecg/versionawareldesinldp";
import { QueryAnnotationPublishing } from "./QueryAnnotationPublishing";
import * as CONFIG from '../../config/ldes_properties.json';
import * as AGG_CONFIG from '../../config/pod_credentials.json';
import { RSPQLParser } from "../parsers/RSPQLParser";
import { Logger, ILogObj } from "tslog";
const ld_fetch = require('ldfetch');
const ldfetch = new ld_fetch({});
import { EndpointQueries } from "../../server/EndpointQueries";

export class LDESPublisher {
    public initialised: boolean = false;
    private session: any;
    public lilURL: string = CONFIG.LIL_URL
    private treePath = CONFIG.TREE_PATH;
    public config: VLILConfig;
    public parser: RSPQLParser;
    private query_annotation_publisher: QueryAnnotationPublishing;
    public logger: Logger<ILogObj>;
    public endpoint_queries: EndpointQueries;

    constructor() {
        this.initialise();
        this.config = {
            treePath: this.treePath, versionOfPath: "1.0"
        }
        this.parser = new RSPQLParser();
        this.logger = new Logger();
        this.query_annotation_publisher = new QueryAnnotationPublishing();
        this.endpoint_queries = new EndpointQueries();
    }

    async initialise() {
        this.session = await getAuthenticatedSession({
            webId: AGG_CONFIG.aggregation_pod_web_id,
            password: AGG_CONFIG.aggregation_pod_password,
            email: AGG_CONFIG.aggregation_pod_email,
        })
        const communication = new LDPCommunication();
        const lil: ILDES = new LDESinLDP(this.lilURL, communication);
        const vlil: VersionAwareLDESinLDP = new VersionAwareLDESinLDP(lil)
        await vlil.initialise(this.config)
        console.log(`Initialised LDES at ${this.lilURL}`);

        try {
            const metadataStore = await lil.readMetadata();
            const ldes = metadataStore.getSubjects(RDF.type, LDES.EventStream, null);
            if (ldes.length > 1) {
                console.log(`More than one LDES is present. We are extracting the first one at, ${ldes[0].value}`);
            }
        } catch (error) {
            console.log(error);
            console.log(`No LDES is present.`);
        }
        return true;
    }

    async publish(resourceList: any[], start_time: Date, end_time: Date): Promise<boolean> {
        if (resourceList.length === 0) {
            console.log("No resources to publish");
            return false;
        }
        else {
            const config: LDESConfig = {
                LDESinLDPIdentifier: this.lilURL, treePath: this.treePath, versionOfPath: "1.0",
            }
            const query = this.endpoint_queries.get_query("averageHRPatient1", start_time, end_time)
            if (query != undefined) {
                await this.query_annotation_publisher.publish(query, this.lilURL, resourceList, this.treePath, config, start_time, end_time, this.session).then(() => {
                    console.log("Published query annotation");
                    this.update_latest_inbox(this.lilURL);
                });
                return true;
            }
            else {
                console.log("The query is undefined and thus could not be published.");
                return false;
            }
        }

    }

    public async update_latest_inbox(aggregation_pod_ldes_location: string) {
        const inbox_location: string[] = [];
        ldfetch.get(aggregation_pod_ldes_location).then((response: any) => {
            for (const quad of response.triples) {
                if (quad.predicate.value == "http://www.w3.org/ns/ldp#inbox") {
                    inbox_location.push(quad.object.value);
                }
            }
            const latest_inbox = inbox_location.sort()[inbox_location.length - 1];
            fetch(aggregation_pod_ldes_location, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/sparql-update'
                },
                body: "INSERT DATA { <" + aggregation_pod_ldes_location + "> <http://www.w3.org/ns/ldp#inbox> <" + latest_inbox + "> }",
            }).then((response) => {
                if (response.ok) {
                    this.logger.debug(`The latest inbox of the LDP container is patched successfully.`)
                }
                else {
                    this.logger.error(`The latest inbox of the LDP container could not be patched. ${response}`)
                }
            })
        })
    }
}
