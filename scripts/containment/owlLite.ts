const RDFLib = require("rdflib");

// Set up a new RDFLib store
const store = RDFLib.graph();

// Set up the SPARQL endpoint URL
const sparqlEndpoint = "https://dbpedia.org/sparql";

// Define the SPARQL query
const sparqlQuery = `
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  SELECT ?class WHERE {
    ?class rdfs:subClassOf <http://dbpedia.org/ontology/Person>.
  }
`;

// Execute the SPARQL query and load the results into the RDFLib store
const fetcher = new RDFLib.Fetcher(store);
fetcher.load(sparqlEndpoint, { query: sparqlQuery }).then(() => {
  // Convert the results to OWL Lite
  const serializer = new RDFLib.Serializer(store);
  const owlLite = serializer.statementsToN3(store.statementsMatching(null, RDFLib.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), RDFLib.namedNode("http://www.w3.org/2002/07/owl#Class")));
  console.log(owlLite);
  console.log("Done");
}).catch((error: any) => {
  console.error(error);
});
