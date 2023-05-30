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
} from "@treecg/versionawareldesinldp";
import { QueryAnnotationPublishing } from "../../utils/algorithms/QueryAnnotationPublishing";
import {
    initSession
} from "../../utils/ldes-in-ldp/EventSource";
import * as CONFIG from '../../config/ldes_properties.json';
import { RSPQLParser } from "../parsers/RSPQLParser";
import { Logger, ILogObj } from "tslog";
import { EndpointQueries } from "../../server/EndpointQueries";

export class LDESPublisher {

    public initialised: boolean = false;
    private credentialsFileName: any = CONFIG.CREDENTIALS_FILE_NAME;
    private session: any;
    private lilURL: string = CONFIG.LIL_URL
    private prefixFile = CONFIG.PREFIX_FILE;
    private treePath = CONFIG.TREE_PATH;
    public config: LDESConfig;
    private amount = CONFIG.AMOUNT;
    private bucketSize = CONFIG.BUCKET_SIZE;
    private logLevel = CONFIG.LOG_LEVEL;
    private aggregationQuery: string = "";
    private parser: any;
    private query_annotation_publisher: QueryAnnotationPublishing;
    public logger: Logger<ILogObj>;
    public endpoint_queries: EndpointQueries;

    constructor(latest_minutes_to_retrieve: number) {
        this.config = {
            LDESinLDPIdentifier: this.lilURL, treePath: this.treePath, versionOfPath: "1.0",
        }
        this.parser = new RSPQLParser();
        this.logger = new Logger();
        this.query_annotation_publisher = new QueryAnnotationPublishing();
        this.endpoint_queries = new EndpointQueries(latest_minutes_to_retrieve);
        this.initialise();
    }

    async initialise() {
        const s = await initSession(this.credentialsFileName);
        if (s) {
            console.log(`User logged in: ${s.info.webId}`);
        }
        this.session = s;
        const communication = this.session ? new SolidCommunication(this.session) : new LDPCommunication();
        const lil: ILDES = await new LDESinLDP(this.lilURL, communication);
        let metadata: LDESMetadata | undefined;
        const versionAware = new VersionAwareLDESinLDP(lil);
        await versionAware.initialise(this.config);
        try {
            const metadataStore = await lil.readMetadata();
            const ldes = metadataStore.getSubjects(RDF.type, LDES.EventStream, null);
            if (ldes.length > 1) {
                console.log(`More than one LDES is present. We are extracting the first one at, ${ldes[0].value}`);
            }
            metadata = extractLdesMetadata(metadataStore, ldes[0].value);

        } catch (error) {
            console.log(error);
            console.log(`No LDES is present.`);
        }
        const eventStreamURI = metadata ? metadata.ldesEventStreamIdentifier : this.lilURL + "#EventStream";
        return true;
    }

    publish(resourceList: any[], start_time: Date, end_time: Date) {
        if (resourceList.length === 0) {
            console.log("No resources to publish");
            return;
        }
        else {
            const config: LDESConfig = {
                LDESinLDPIdentifier: this.lilURL, treePath: this.treePath, versionOfPath: "1.0",
            }
            let query = this.endpoint_queries.get_query("averageHRPatient1")
            if (query != undefined) {
                this.query_annotation_publisher.publish(query, this.lilURL, resourceList, this.treePath, this.bucketSize, config, start_time, end_time, this.session);
            }
        }

    }
}
