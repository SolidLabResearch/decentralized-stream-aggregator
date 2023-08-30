import { SinglePodAggregator } from "./SinglePodAggregator";
import { Logger, ILogObj } from "tslog";
import { RSPQLParser } from "rsp-js";
import { getAuthenticatedSession } from "css-auth-login";
const QueryEngine = require('@comunica/query-sparql-link-traversal').QueryEngine;
import { authenticated_session_object, authentication_map } from "../../config/authentication_map";
import { LDPCommunication } from "@treecg/versionawareldesinldp";
const parser = new RSPQLParser();
const linkTraversalEngine = new QueryEngine();

export class AggregatorInstantiator {
    public currentTime: any;
    public solidServerURL: string;
    public query: string;
    public logger: Logger<ILogObj>;
    public stream_name: string;
    public session: any;
    public from : Date;
    public to : Date;

    /**
     * Creates an instance of AggregatorInstantiator.
     * @param {string} continuousQuery
     * @param {number} latestMinutes
     * @param {string} serverURL
     * @memberof AggregatorInstantiator
     */
    constructor(continuousQuery: string, serverURL: string, from_timestamp: number, to_timestamp: number) {
        this.currentTime = new Date();
        this.solidServerURL = serverURL;
        this.query = continuousQuery;
        this.logger = new Logger();
        this.from = new Date(from_timestamp);
        this.to = new Date(to_timestamp);        
        this.stream_name = parser.parse(this.query).s2r[0].stream_name;
        this.instantiateAggregator(this.stream_name, this.from, this.to).then(() => {
            this.logger.info(`Aggregator for ${this.stream_name} started`);
        });
    }

    async start_aggregator(stream_name: string) {
        const has_matches = await linkTraversalEngine.queryBoolean(`
        PREFIX ldes: <https://w3id.org/ldes#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX tree: <https://w3id.org/tree#>
        ASK {
            <${stream_name}> rdf:type tree:Node .
        }
        `);
        if (has_matches) {
            await this.instantiateAggregator(stream_name, this.from, this.to);
        }
        else {
            this.logger.error(`The stream ${stream_name} doesn't point to an LDES Event Stream`);
        }
    }

    /**
     * Instantiates the aggregator for each LDES in LDP compliant solid pod.
     *
     * @param {string} LILContainer
     * @param {string} query
     * @memberof AggregatorInstantiator
     */
    async instantiateAggregator(stream_name: string, from_timestamp: Date, to_timestamp: Date) {
        let authentication_object: authenticated_session_object = authentication_map.get(this.stream_name)!;
        // this.session = await getAuthenticatedSession({
        //     webId: authentication_object.web_id,
        //     password: authentication_object.password,
        //     email: authentication_object.email
        // })
        // new SinglePodAggregator(stream_name, this.query, 'ws://localhost:8080/', new Date(this.currentTime - this.latestMinutes), this.currentTime, this.latestMinutes, this.session);
        /**
         * The following line is for testing purposes only for historical data.
         */
        new SinglePodAggregator(stream_name, this.query, 'ws://localhost:8080/', "2022-11-07T09:27:17.5890", "2024-11-07T09:27:17.5890");

        // Original Code Block
        // new SinglePodAggregator(stream_name, this.query, 'ws://localhost:8080', from_timestamp, to_timestamp, this.session);        
    }

}
