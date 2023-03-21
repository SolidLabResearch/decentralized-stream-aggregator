import { isomorphic } from "rdf-isomorphic";
import { DataFactory, Quad } from "rdf-data-factory";
import { RSPQLParser } from "./RSPQLParser";
import { Logger, ILogObj } from "tslog";
import { BlankNode } from "n3";
let sparqlParser = require('sparqljs').Parser;
let SPARQLParser = new sparqlParser();

export class QueryRegistry {
    registeredQueries: Map<number, string>;
    executedQueries: any[];
    futureQueries: any[];
    executingQueries: any[];
    queryCount: number;
    parser: any;
    logger: Logger<ILogObj>;

    constructor() {
        this.registeredQueries = new Map();
        this.executingQueries = [];
        this.executedQueries = [];
        this.futureQueries = [];
        this.queryCount = 0;
        this.parser = new RSPQLParser();
        this.logger = new Logger();
    }

    registerQuery(rspqlQuery: string) {
        this.registeredQueries.set(this.queryCount, rspqlQuery);
        this.queryCount++;
        if (this.checkUniqueQuery(rspqlQuery)) {
            /*
            The query you have registered is already executing.
            */
            return false;
        }
        else {
            /*
            The query you have registered is not already executing.
            */
            this.add(rspqlQuery);
            return true;
        }
    }

    add(query: string) {
        this.executingQueries.push(query);
    }

    checkUniqueQuery(query: string) {
        let registeredQueries = this.getRegisteredQueries();
        let queryArray: any[] = [];
        registeredQueries.forEach((value, key) => {
            queryArray.push(value);
        })
        if (queryArray.length > 1) {
            for (let i = 0; i < queryArray.length; i++) {
                let queryArrayElement = this.parser.parse(queryArray[i]);
                let RSPQLqueryParsed = this.parser.parse(query);
                if (this.checkIfStreamParametersAreEqual(query, queryArray[i])) {
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
                    this.logger.info('The stream parameters are not equal.')
                    return false;
                }
            }
        }
        return false;
    }

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

    getRegisteredQueries() {
        return this.registeredQueries;
    }

    checkIfQueriesAreIsomorphic(queryOne: Quad[], queryTwo: Quad[]) {
        return isomorphic(queryOne, queryTwo)
    }

    generateBGPQuadsFromQueries(query: string) {
        let parsedJSON = SPARQLParser.parse(query);
        let basicGraphPattern = parsedJSON.where[0].patterns[0].triples;
        let graph = this.convertToGraph(basicGraphPattern);
        return graph;
    }

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
            if (predicate.termType === 'Variable') {
                predicate = new BlankNode(predicate);
            }
            let quad = new DataFactory().quad(subject, predicate, object);
            graph.push(quad);
        }
        return graph;
    }



}