import { isomorphic } from "rdf-isomorphic";
import { DataFactory, Quad } from "rdf-data-factory";
import { RSPQLParser } from "../parsers/RSPQLParser";
import { Logger, ILogObj } from "tslog";
import { BlankNode } from "n3";
let sparqlParser = require('sparqljs').Parser;
let SPARQLParser = new sparqlParser();

export class QueryRegistry {
    registered_queries: Map<number, string>;
    executed_queries: any[];
    future_queries: any[];
    executing_queries: any[];
    query_count: number;
    parser: any;
    logger: Logger<ILogObj>;

    /**
     * Creates an instance of QueryRegistry.
     * @memberof QueryRegistry
     */
    constructor() {
        /**
         * Map of registered queries which are the queries without any analysis by the QueryRegistry but only registered.  
        */    
        this.registered_queries = new Map();
        /**
         * Array of executing queries which were unique as compared to all the existing queries in the QueryRegistry. 
         */
        this.executing_queries = [];
        this.executed_queries = [];
        this.future_queries = [];
        this.query_count = 0;
        this.parser = new RSPQLParser();
        this.logger = new Logger();
    }
    /**
     *  Register a query in the QueryRegistry.
     *
     * @param {string} rspql_query
     * @return {*} 
     * @memberof QueryRegistry
     */
    registerQuery(rspql_query: string) {
        this.registered_queries.set(this.query_count, rspql_query);
        this.query_count++;
        if (this.checkUniqueQuery(rspql_query)) {
            /*
            The query you have registered is already executing.
            */
            return false;
        }
        else {
            /*
            The query you have registered is not already executing.
            */
            this.add_to_executing_queries(rspql_query);
            return true;
        }
    }

    /**
     * Add a query to the executing queries.
     *
     * @param {string} query
     * @memberof QueryRegistry
     */
    add_to_executing_queries(query: string) {
        this.executing_queries.push(query);
    }

    /**
     * Checking if the query is unique or if it is isomorphic with an already executing query.
     *
     * @param {string} query
     * @return {*} 
     * @memberof QueryRegistry
     */
    checkUniqueQuery(query: string) {
        let registered_queries = this.get_registered_queries();
        let queryArray: any[] = [];
        registered_queries.forEach((value, key) => {
            queryArray.push(value);
        })
        if (queryArray.length > 1) {
            for (let i = 0; i < queryArray.length; i++) {
                let queryArrayElement = this.parser.parse(queryArray[i]);
                let RSPQLqueryParsed = this.parser.parse(query);
                if (this.checkIfStreamParametersAreEqual(query, queryArray[i]) && this.checkIfWindowParametersAreEqual(query, queryArray[i])) {
                    let RSPQLqueryParsedBGP = this.generateBGPQuadsFromQueries(RSPQLqueryParsed.sparql);
                    let queryArrayElementBGP = this.generateBGPQuadsFromQueries(queryArrayElement.sparql);
                    let isomorphism = this.checkIfQueriesAreIsomorphic(queryArrayElementBGP, RSPQLqueryParsedBGP)
                    if (isomorphism) {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
                else {
                    /*
                    The stream parameters (the stream name and window size / slide) are not equal.
                    */
                    return false;
                }
            }
        }
        return false;
    }

    /**
     * Checking if two different queries have the same stream parameters.
     *
     * @param {string} queryOne
     * @param {string} queryTwo
     * @return {*} 
     * @memberof QueryRegistry
     */
    checkIfStreamParametersAreEqual(queryOne: string, queryTwo: string) {
        let queryOneParsed = this.parser.parse(queryOne);
        let queryTwoParsed = this.parser.parse(queryTwo);
        if (queryOneParsed.s2r[0].stream_name === queryTwoParsed.s2r[0].stream_name) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * Checking if two different queries have the same window parameters.
     *
     * @param {string} queryOne
     * @param {string} queryTwo
     * @return {*} 
     * @memberof QueryRegistry
     */
    checkIfWindowParametersAreEqual(queryOne: string, queryTwo: string) {
        let queryOneParsed = this.parser.parse(queryOne);
        let queryTwoParsed = this.parser.parse(queryTwo);
        if (queryOneParsed.s2r[0].window_name === queryTwoParsed.s2r[0].window_name) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * Get the window width and slide of a query.
     *
     * @param {string} queryOne
     * @return {*} 
     * @memberof QueryRegistry
     */
    getWindowWidthAndSlide(queryOne: string) {
        let queryOneParsed = this.parser.parse(queryOne);
        let window_width = queryOneParsed.s2r[0].width;
        let window_slide = queryOneParsed.s2r[0].slide;
        return { "window_width": window_width, "window_slide": window_slide };
    }

    /**
     * Get the registered queries.
     * @return {*} 
     * @memberof QueryRegistry
     */
    get_registered_queries() {
        return this.registered_queries;
    }

    /**
     * checking if query quads generated from the basic graph patterns are isomorphic.
     *
     * @param {Quad[]} queryOne
     * @param {Quad[]} queryTwo
     * @return {*} 
     * @memberof QueryRegistry
     */
    checkIfQueriesAreIsomorphic(queryOne: Quad[], queryTwo: Quad[]) {
        return isomorphic(queryOne, queryTwo)
    }

    /**
     * Generate the quads from the basic graph patterns of a query.
     *
     * @param {string} query
     * @return {*} 
     * @memberof QueryRegistry
     */
    generateBGPQuadsFromQueries(query: string) {
        let parsedJSON = SPARQLParser.parse(query);
        let basicGraphPattern = parsedJSON.where[0].patterns[0].triples;
        let graph = this.convertToGraph(basicGraphPattern);
        return graph;
    }

    /**
     * Generate a quad array from a basic graph pattern of a sparql query.
     *
     * @param {*} basicGraphPattern
     * @return {*} 
     * @memberof QueryRegistry
     */
    convertToGraph(basicGraphPattern: any) {
        let graph: Quad[] = [];
        for (let i = 0; i < basicGraphPattern.length; i++) {
            let subject = basicGraphPattern[i].subject;
            let predicate = basicGraphPattern[i].predicate;
            let object = basicGraphPattern[i].object;
            if (subject.termType === 'Variable') {
                subject = new BlankNode(subject);
            }
            if (object.termType === 'Variable') {
                object = new BlankNode(object);
            }
            let quad = new DataFactory().quad(subject, predicate, object);
            graph.push(quad);
        }
        return graph;
    }

    /**
     * Convert the variables of a query to blank nodes.
     *
     * @param {*} node
     * @return {*} 
     * @memberof QueryRegistry
     */
    convertVariablesToBlankNodes(node: any) {
        if (node.termType === 'Variable') {
            return new BlankNode(node);
        }
    }

    get_executing_queries() {
        return this.executing_queries;
    }
}