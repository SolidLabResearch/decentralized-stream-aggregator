import { SPARQLToRSPQL } from "../../service/SPARQLToRSPQL";

let sparqlToRSPQL = new SPARQLToRSPQL(

    `
    Select ?aggregation ?timestamp ?value WHERE {?aggregation <https://saref.etsi.org/core/hasTimestamp> ?timestamp . ?aggregation <https://argahsuknesib.github.io/asdo/hasValue> ?value . FILTER (?timestamp > 167579998 && ?timestamp < 167580000) }
    `
);

let rspqlQuery = sparqlToRSPQL.getRSPQLQuery();

console.log(rspqlQuery);
