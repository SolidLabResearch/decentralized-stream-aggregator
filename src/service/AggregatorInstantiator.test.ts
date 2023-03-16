import { AggregatorInstantiator } from "./AggregatorInstantiator"

describe('AggregatorInstantiatorTest', async () => {
    let continuousQuery = `
    PREFIX : <https://rsp.js/> PREFIX saref: <https://saref.etsi.org/core/> PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
    REGISTER RStream <output> AS
    SELECT (AVG(?o) AS ?averageAcceleration)
    FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
    WHERE{
        WINDOW :w1 { ?s saref:hasValue ?o .
                }
            }
        `
    let solidServerURL = "http://localhost:3000/";
    let aggregatorInstantiator = new AggregatorInstantiator(continuousQuery, 30, solidServerURL);

    it ('discover_LIL_function_test', async () => {
        let LIL = await aggregatorInstantiator.discoverLIL(solidServerURL);
        expect(LIL).toBe("http://localhost:3000/dataset_participant1/data/")
    })
})