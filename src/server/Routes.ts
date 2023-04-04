import { AggregatorInstantiator } from "../service/AggregatorInstantiator";
let express = require('express');
let router = express.Router();

router.use(function timeLog(req: any, res: any, next: any) {
    console.log('Time: ', Date.now());
    next();
});

router.get('/', function (req: any, res: any) {
    res.send('Hello World!');
});

router.get('/averageHRPatient1', (req: any, res: any) => {
    let query = `  
    PREFIX saref: <https://saref.etsi.org/core/> 
    PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
    PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT (AVG(?o) AS ?averageHR1)
    FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
    WHERE{
        WINDOW :w1 { ?s saref:hasValue ?o .
                     ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
    }
    `
    res.send('Received request on /averageHRPatient1');
    // new AggregatorInstantiator(query, minutes, 'http://localhost:3000/');
});

module.exports = router;