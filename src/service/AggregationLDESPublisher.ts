import { LDESinLDP, LDESMetadata, LDPCommunication, SolidCommunication, RDF, LDES, extractLdesMetadata, LDESConfig, VersionAwareLDESinLDP, ILDES } from "@treecg/versionawareldesinldp";
import { naiveAlgorithm } from "../utils/algorithms/naiveAlgorithm";
import { getTimeStamp, prefixesFromFilepath, resourceToOptimisedTurtle, Resource, initSession } from "../utils/EventSource";
import * as CONFIG from '../config/ldes_properties.json';
export class AggregationLDESPublisher {

    private credentialsFileName: any = CONFIG.CREDENTIALS_FILE_NAME;
    private session: any;
    private lilURL = CONFIG.LIL_URL;
    private prefixFile = CONFIG.PREFIX_FILE;
    private treePath = CONFIG.TREE_PATH;
    private amount = CONFIG.AMOUNT;
    private bucketSize = CONFIG.BUCKET_SIZE;
    private logLevel = CONFIG.LOG_LEVEL;
    public initialised: boolean = false;
    public config: LDESConfig = {
        LDESinLDPIdentifier: this.lilURL,
        treePath: this.treePath,
        versionOfPath: "1.0",
    }

    constructor() {
        this.initialise();
    }

    async initialise() {
        const s = await initSession(this.credentialsFileName);
        if (s) {
            console.log(`User logged in: ${s.info.webId}`);
        }
        this.session = s;

        const commuication = this.session ? new SolidCommunication(this.session) : new LDPCommunication();
        const lil: ILDES  = await new LDESinLDP(this.lilURL, commuication);
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
    }

    publish(resourceList: any[]) {
        if (resourceList.length === 0) {
            console.log("No resources to publish");
            return;
        }

        const prefixes = prefixesFromFilepath(this.prefixFile, this.lilURL);
        const config: LDESConfig = {
            LDESinLDPIdentifier: this.lilURL,
            treePath: this.treePath,
            versionOfPath: "1.0",
        }

        naiveAlgorithm(this.lilURL, resourceList, this.treePath, this.bucketSize, config, this.session, this.logLevel)
    }
}