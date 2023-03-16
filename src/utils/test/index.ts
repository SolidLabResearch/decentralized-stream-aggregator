const QueryEngine = require('@comunica/query-sparql').QueryEngine;
const queryEngine = new QueryEngine();
const participantOneProfileCard = "http://localhost:3000/dataset_participant1/profile/card#me";

async function main(){
    const bindingStream = await queryEngine.queryBindings(`
    PREFIX asdo: <http://argahsuknesib.github.io/> 
    select ?aggregator where {
     <${participantOneProfileCard}> asdo:aggregatorLocation ?aggregator .
    }
    `, {
        sources: [`${participantOneProfileCard}`]
    });

    bindingStream.on('data', async (bindings: any) => {
        console.log(bindings.get('aggregator').value);
    });
}

main().then((result: void) => {
    console.log(`started`);
});
