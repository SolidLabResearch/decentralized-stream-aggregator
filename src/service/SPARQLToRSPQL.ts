let SparqlParser = require('sparqljs').Parser;
let parser = new SparqlParser();
const Store = require('n3').Store;
export class SPARQLToRSPQL {
    private extractedVariables: string[];
    private extractedGraphPatterns: typeof Store;
    private sparqlQuery: string;
    private operationArgs: Map<string, string>;
    private operator: string;
    constructor(sparqlQuery: string) {
        this.sparqlQuery = sparqlQuery;
        this.extractedVariables = [];
        this.extractedGraphPatterns = new Store();
        this.operationArgs = new Map<string, string>();
        this.operator = '';
    }

    public getRSPQLQuery(): string {
        let parsedQuery = parser.parse(this.sparqlQuery);
        if (parsedQuery.type === 'query') {
            if (parsedQuery.queryType === 'SELECT' || 'select') {
                let queryVariables = parsedQuery.variables;
                for (let i = 0; i < queryVariables.length; i++) {
                    if (queryVariables[i].termType === 'Variable') {
                        this.extractedVariables.push(queryVariables[i].value);
                    }
                }
                let queryBasicGraphPatterns = parsedQuery.where;
                for (let g = 0; g < queryBasicGraphPatterns.length; g++) {
                    if (queryBasicGraphPatterns[g].type === 'bgp') {
                        this.extractedGraphPatterns.addQuads(queryBasicGraphPatterns[g].triples);
                    }
                    else if (queryBasicGraphPatterns[g].type === 'filter') {
                        if (queryBasicGraphPatterns[g].expression.type === 'operation') {
                            this.operator = queryBasicGraphPatterns[g].expression.operator;
                            for (let a = 0; a < queryBasicGraphPatterns[g].expression.args.length; a++) {
                                if (queryBasicGraphPatterns[g].expression.args[a].type === 'operation') {
                                    for (let operator = 0; operator < queryBasicGraphPatterns[g].expression.args[a].args.length; operator++) {
                                        if (queryBasicGraphPatterns[g].expression.args[a].args[operator].termType === 'Literal') {
                                            this.operationArgs.set(queryBasicGraphPatterns[g].expression.args[a].operator, queryBasicGraphPatterns[g].expression.args[a].args[operator].value)
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            throw new Error("Not supported filter expression type.");
                        }
                    }
                }
            }
            else {
                throw new Error('The query is not a SELECT query, please check your query. Only SELCT queries are supported.');
            }

        }
        else {
            throw new Error('The query is not a SPARQL query, please check your query.');
        }        
        return '';
    }
}