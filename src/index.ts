import { HTTPServer } from "./server/HTTPServer";

const program = require('commander');

program
    .version('0.0.1')
    .description('Aggregating LDES streams from a Solid Pod.')
    .name('solid-stream-aggregator')

program
    .command('aggregation')
    .description('Starting the aggregation service.')
    .option(
        '-p, --port <port>',
        'The port of the REST server',
        '8080'
    )
    .option(
        '-s, --minutes <minutes>',
        'The last x minutes to aggregate',
        '30'
    )
    .option(
        '-q --query <query>',
        'Default RSPQL query to aggregate',
        `PREFIX : <https://rsp.js/> PREFIX saref: <https://saref.etsi.org/> PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
         REGISTER RStream <output> AS
         SELECT (AVG(?o) AS ?averageAcceleration)
         FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
         WHERE{
             WINDOW :w1 { ?s <https://saref.etsi.org/core/hasValue> ?o .
                        ?s saref:relatesToProperty dahccsensors:smartphone.acceleration.y .
                    } 
                }`
    )
    .option(
        '-ss --SolidServer <SolidServer>',
        'URL of the Solid server to use',
        'http://localhost:3000/'
    )
    .action((options: any) => {
        new HTTPServer(options.port, options.minutes, options.SolidServer);
    });

program.parse();
