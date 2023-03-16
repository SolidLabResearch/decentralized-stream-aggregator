import { SinglePodAggregator } from "./SinglePodAggregator";

describe('testing_the_single_pod_aggregator', () => {
    let query = `
            PREFIX : <https://rsp.js/> PREFIX saref: <https://saref.etsi.org/core/> PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
         REGISTER RStream <output> AS
         SELECT (AVG(?o) AS ?averageAcceleration)
         FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
         WHERE{
             WINDOW :w1 { ?s saref:hasValue ?o .
                    } 
                }
            `
    let wssURL = "ws://localhost:8080/";
    let singlePodAggregator = new SinglePodAggregator("http://localhost:3000/dataset_participant1/data/", query, "http://localhost:8080/", "2022-11-07T09:27:17.5890", "2024-11-07T09:27:17.5890", "http://localhost:3000/dataset_participant1/data/" )
    it('generate_aggregation_event_function_test', () => {
        let value: string = `
        <https://rsp.js/AggregationEvent6> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://saref.etsi.org/core/Measurement> .
        <https://rsp.js/AggregationEvent6> <https://saref.etsi.org/core/hasTimestamp> "1970-01-20T09:49:34.614Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
        <https://rsp.js/AggregationEvent6> <https://saref.etsi.org/core/hasValue> "5"^^<http://www.w3.org/2001/XMLSchema#float> .
        <https://rsp.js/AggregationEvent6> <http://www.w3.org/ns/prov#wasDerivedFrom> <https://argahsuknesib.github.io/asdo/AggregatorService> .
        <https://rsp.js/AggregationEvent6> <http://www.w3.org/ns/prov#generatedBy> <http://localhost:3000/dataset_participant1/data/> .
        `
        let aggregationEvent = singlePodAggregator.generateAggregationEvent(5, 1676974614, "http://localhost:3000/dataset_participant1/data/", 6);
        expect(aggregationEvent).toBe(value)
    })

    it('connect_with_server_function_test', async() => {

        let connection = await singlePodAggregator.connectWithServer(wssURL);
        // expect(connection).toBe('it is connected')
    })

    it ('epoch_function_test', async () => {
        let date = "2016-12-31T23:59:59Z";
        let epoch = await singlePodAggregator.epoch(date);
        expect(epoch).toBe(1483228799000)
    })    
});