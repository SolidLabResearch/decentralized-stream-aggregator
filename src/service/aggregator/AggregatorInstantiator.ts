import { SinglePodAggregator } from "./SinglePodAggregator";
import { Logger, ILogObj } from "tslog";
const QueryEngine = require('@comunica/query-sparql-link-traversal').QueryEngine;
const linkTraversalEngine = new QueryEngine();

export class AggregatorInstantiator {
    public latestMinutes: number;
    public currentTime: any;
    public solidServerURL: string;
    public query: string;
    public logger: Logger<ILogObj>;

    /**
     * Creates an instance of AggregatorInstantiator.
     * @param {string} continuousQuery
     * @param {number} latestMinutes
     * @param {string} serverURL
     * @memberof AggregatorInstantiator
     */
    constructor(continuousQuery: string, latestMinutes: number, serverURL: string) {
        this.latestMinutes = latestMinutes;
        this.currentTime = new Date();
        this.solidServerURL = serverURL;
        this.query = continuousQuery;
        this.logger = new Logger();
        this.discoverLIL(this.solidServerURL).then(() => {
            this.logger.info(`The process to discover LILs has been started`);
        });
    }

    /**
     * Discovers the pods in the server which complies with the LDES in LDP
     *  specification (https://woutslabbinck.github.io/LDESinLDP/) for storing streams in the Solid Pods.
     * @param {string} solidServerURL
     * @memberof AggregatorInstantiator
     */
    async discoverLIL(solidServerURL: string) {
        const bindingStream = await linkTraversalEngine.queryBindings(`
            PREFIX tree: <https://w3id.org/tree#>
            PREFIX ldp: <http://www.w3.org/ns/ldp#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            SELECT ?LIL WHERE {
                <${solidServerURL}> ldp:contains ?pod .
                ?pod ldp:contains ?LIL .
                ?LIL rdf:type tree:Node .
            }
            `, {
            sources: [`${solidServerURL}`]
        });

        bindingStream.on('data', async (bindings: any) => {
            await this.instantiateAggregator(bindings.get('LIL').value);
        });
    }

    /**
     * Instantiates the aggregator for each LDES in LDP compliant solid pod.
     *
     * @param {string} LILContainer
     * @param {string} query
     * @memberof AggregatorInstantiator
     */
    async instantiateAggregator(LILContainer: string) {
        // new SinglePodAggregator(LILContainer, query, 'ws://localhost:8080/', new Date(this.currentTime - this.latestMinutes), this.currentTime, LILContainer);
        /**
         * The following line is for testing purposes only for historical data.
         */
        new SinglePodAggregator(LILContainer, this.query, 'ws://localhost:8080/', "2022-11-07T09:27:17.5890", "2024-11-07T09:27:17.5890", this.latestMinutes);
    }

}
