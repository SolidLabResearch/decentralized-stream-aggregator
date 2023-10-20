import {
    LDESinLDP,
    LDESMetadata,
    LDPCommunication,
    SolidCommunication,
    RDF,
    LDES,
    extractLdesMetadata,
    LDESConfig,
    VersionAwareLDESinLDP,
    ILDES,
    getAuthenticatedSession,
    LILConfig,
    VLILConfig
} from "@treecg/versionawareldesinldp";
import { QueryAnnotationPublishing } from "./QueryAnnotationPublishing";
import {
    initSession, Resource
} from "../../utils/ldes-in-ldp/EventSource";
import { Session } from "@rubensworks/solid-client-authn-isomorphic";
import * as CONFIG from '../../config/ldes_properties.json';
import * as AGG_CONFIG from '../../config/pod_credentials.json';
import { RSPQLParser } from "../parsers/RSPQLParser";
import { Logger, ILogObj } from "tslog";
const ld_fetch = require('ldfetch');
const ldfetch = new ld_fetch({});
import { EndpointQueries } from "../../server/EndpointQueries";

export class LDESPublisher {
    public initialised: boolean = false;
    private credentialsFileName: string | null = CONFIG.CREDENTIALS_FILE_NAME;
    private session: Session | undefined = undefined;
    private lilURL: string = CONFIG.LIL_URL
    private prefixFile = CONFIG.PREFIX_FILE;
    private treePath = CONFIG.TREE_PATH;
    public config: VLILConfig;
    private amount: number = CONFIG.AMOUNT;
    private bucketSize: number = CONFIG.BUCKET_SIZE;
    private logLevel: string = CONFIG.LOG_LEVEL;
    private aggregationQuery: string = "";
    private parser: RSPQLParser;
    private query_annotation_publisher: QueryAnnotationPublishing;
    public logger: Logger<ILogObj>;
    public endpoint_queries: EndpointQueries;

    constructor() {
        this.config = {
            treePath: this.treePath, versionOfPath : "1.0"
        }
        this.parser = new RSPQLParser();
        this.logger = new Logger();
        this.query_annotation_publisher = new QueryAnnotationPublishing();
        this.endpoint_queries = new EndpointQueries();
        this.initialise();
    }

    async initialise() {
        this.session = await getAuthenticatedSession({
            webId: AGG_CONFIG.aggregation_pod_web_id,
            password: AGG_CONFIG.aggregation_pod_password,
            email: AGG_CONFIG.aggregation_pod_email,
        })
        const communication = new SolidCommunication(this.session);
        const lil: ILDES = new LDESinLDP(this.lilURL, communication);
        let metadata: LDESMetadata | undefined;
        // this.config.date = new Date(0);
        // await lil.initialise(this.config);
        const vlil: VersionAwareLDESinLDP = new VersionAwareLDESinLDP(lil)
        await vlil.initialise(this.config)
        try {
            const metadataStore = await lil.readMetadata();
            const ldes = metadataStore.getSubjects(RDF.type, LDES.EventStream, null);
            if (ldes.length > 1) {
                console.log(`More than one LDES is present. We are extracting the first one at, ${ldes[0].value}`);
            }
            // metadata = extractLdesMetadata(metadataStore, ldes[0].value);

        } catch (error) {
            console.log(error);
            console.log(`No LDES is present.`);
        }
        return true;
    }

    publish(resourceList: Resource[], start_time: Date, end_time: Date) {
        if (resourceList.length === 0) {
            console.log("No resources to publish");
            return;
        }
        else {
            const config: LDESConfig = {
                LDESinLDPIdentifier: this.lilURL, treePath: this.treePath, versionOfPath: "1.0",
            }
            let query = this.endpoint_queries.get_query("averageHRPatient1", start_time, end_time)
            if (query != undefined) {
                this.query_annotation_publisher.publish(query, this.lilURL, resourceList, this.treePath, config, start_time, end_time, this.session).then(() => {
                    console.log("Published query annotation");
                    this.update_latest_inbox(this.lilURL);
                });
            }
        }

    }

    public async update_latest_inbox(aggregation_pod_ldes_location: string) {
        let inbox_location:string[] = [];
        ldfetch.get(aggregation_pod_ldes_location).then((response: any) => {
            for (let quad of response.triples) {
                if (quad.predicate.value == "http://www.w3.org/ns/ldp#inbox") {
                    inbox_location.push(quad.object.value);
                }
            }
            let latest_inbox = inbox_location.sort()[inbox_location.length - 1];
            fetch(aggregation_pod_ldes_location, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/sparql-update'
                },
                body: "INSERT DATA { <" + aggregation_pod_ldes_location + "> <http://www.w3.org/ns/ldp#inbox> <" + latest_inbox + "> }",
            }).then((response) => {
                if (response.status == 200 || 201 || 205) {
                    this.logger.debug(`The latest inbox of the LDP container is patched successfully.`)
                }
                else {
                    this.logger.error(`The latest inbox of the LDP container could not be patched. ${response}`)
                }
            })
        })
    }
}
