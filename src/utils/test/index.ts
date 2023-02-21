import { SPARQLToRSPQL } from "../../service/SPARQLToRSPQL";
let test = new SPARQLToRSPQL("SELECT ?s ?p ?o WHERE { ?s ?p ?o . ?x ?y ?o FILTER(?o > 10) }");
console.log(test.getRSPQLQuery());
