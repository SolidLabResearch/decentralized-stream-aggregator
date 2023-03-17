import { DataFactory, Quad } from "rdf-data-factory";
let sparqlParser = require('sparqljs').Parser;
import { isomorphic } from "rdf-isomorphic";
let parser = new sparqlParser();
type Query = {
    [key: string]: {
        timestamp: number; query: string;
    }
}

export class QueryRegistry {
    registeredQueries: Map<number, string>;
    executedQueries: any[];
    futureQueries: any[];
    executingQueries: any[];
    queryCount: number;

    constructor() {
        this.registeredQueries = new Map();
        this.executingQueries = [];
        this.executedQueries = [];
        this.futureQueries = [];
        this.queryCount = 0;
    }

    add(query: string) {
        this.registeredQueries.set(this.queryCount, query);
        this.queryCount++;
        if (this.checkUniqueQuery(query)) {
            console.log("The query you have registered is already executing.");
            ;
        }
        else {
            this.executingQueries.push(query);
        }
    }

    remove(count: number) {
        this.registeredQueries.delete(count);
    }

    checkUniqueQuery(query: string) {
        let registeredQueries = this.getregisteredQueries();
        let queryArray: any[] = [];
        registeredQueries.forEach((value, key) => {
            queryArray.push(value);
        });
        if (queryArray.length > 1) {
            for (let i = 0; i <= queryArray.length; i++) {
                let executingQueryQuads = this.generateBGPQuadsFromQueries(queryArray[i]);
                let queryQuads = this.generateBGPQuadsFromQueries(query)
                if (executingQueryQuads === queryQuads) {
                    console.log("Queries are the same");
                }
                let isomorphism = this.checkIfQueriesIsIsomorphic(executingQueryQuads, this.generateBGPQuadsFromQueries(query));
                if (isomorphism) {
                    return true;
                } else {
                    return false;
                }
            }
        }
    }

    generateBGPQuadsFromQueries(query: string) {
        let parsedJSON = parser.parse(query);
        let basicGraphPattern = parsedJSON.where[0].triples;
        let graph = this.convertToGraph(basicGraphPattern);
        return graph;
    }

    convertToGraph(graphPattern: any) {
        let graph: Quad[] = [];
        for (let i = 0; i < graphPattern.length; i++) {
            let subject = graphPattern[i].subject;
            let predicate = graphPattern[i].predicate;
            let object = graphPattern[i].object;
            let quad = new DataFactory().quad(subject, predicate, object);
            graph.push(quad);
        }
        return graph;
    }
    getregisteredQueries() {
        return this.registeredQueries;
    }

    checkIfQueriesIsIsomorphic(queryOne: Quad[], queryTwo: Quad[]) {
        return isomorphic(queryOne, queryTwo);
    }
}