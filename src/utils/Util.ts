import {createHash} from 'crypto'

export function hash_string(input_string:string) {
    input_string = input_string.replace(/\s/g, '');
    const hash = createHash('md5');
    hash.update(input_string);
    return hash.digest('hex');
}

const string = `
PREFIX saref: <https://saref.etsi.org/core/> 
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
PREFIX : <https://rsp.js/>
REGISTER RStream <output> AS
SELECT (AVG(?o) AS ?averageHR1)
FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 1800 STEP 20]
WHERE{
    WINDOW :w1 { ?s saref:hasValue ?o .
                 ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
}  
`

console.log(hash_string(string))
