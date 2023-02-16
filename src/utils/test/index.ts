const QueryEngine = require('@comunica/query-sparql').QueryEngine;
const myEngine = new QueryEngine();

const query = `
SELECT (AVG(?o) as ?avg) WHERE {
    ?s <https://saref.etsi.org/core/hasValue> ?o .
  }
`
async function runQuery() {

 const result = await myEngine.query(`
  SELECT (AVG(?o) as ?avg) WHERE {
    ?s <https://saref.etsi.org/core/hasValue> ?o .
  } LIMIT 100`, {
        sources: ['http://localhost:3000/dataset_participant1/data/1676276846171/6f7d7b90-093f-4b4c-a62c-429c830ee3e3'],
    });
    const { data } = await myEngine.resultToString(result, 'application/sparql-results+json')

    data.on('data', (chunk: any) => {
        console.log(chunk.toString());
    });
}

function kushhasfunction(){
    let something = {"s":{"value":"http://localhost:3000/dataset_participant2/","type":"uri"},"p":{"value":"http://purl.org/dc/terms/modified","type":"uri"},"o":{"value":"2023-02-13T11:54:37.000Z","type":"literal","datatype":"http://www.w3.org/2001/XMLSchema#dateTime"}}
    console.log(something.p.value);
}

async function runQuery2() {
    const result = await myEngine.queryBindings(query, {
        sources: ['http://localhost:3000/dataset_participant1/data/1676276846171/6f7d7b90-093f-4b4c-a62c-429c830ee3e3']
    });
    result.on('data', (data: any) => {
        let iterable = data.values();
        for (let value of iterable) {
            console.log(value.value);
        }
        // console.log(data.values());       
    });
}

runQuery2()