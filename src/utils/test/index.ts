import { SPARQLToRSPQL } from "../../service/SPARQLToRSPQL";
let {Parser: SparqlParser} = require('sparqljs');
let parser = new SparqlParser();
let sparqlToRSPQL = new SPARQLToRSPQL();

let query = `
PREFIX : <https://rsp.js/> PREFIX saref: <https://saref.etsi.org/core/> PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
SELECT (AVG(?o) AS ?averageHR1) (AVG(?x) AS ?averageHR2) {
    ?s saref:hasValue ?o .
    ?s saref:relatesToProperty dahccsensors:wearable.bvp .
}
`;

let parsedQuery = parser.parse(query);
let variables = parsedQuery.variables;
for (let i = 0; i < variables.length; i++) {
    let variable = variables[i].expression.expression.value 
    let aggregationfunction = variables[i].expression.aggregation.toUpperCase();
    
}
console.log(parsedQuery);

