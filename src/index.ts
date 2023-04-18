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
        'The port of the REST HTTP server',
        '8080'
    )
    .option(
        '-s, --minutes <minutes>',
        'The last x minutes to retrieve events from the solid pod and to aggregate over',
        '30'
    )
    .option(
        '-ss --SolidServer <SolidServer>',
        'The URL of the Solid Pod server where the LDES streams are stored in a Solid Pod',
        'http://localhost:3000/'
    )
    .action((options: any) => {
        new HTTPServer(options.port, options.minutes, options.SolidServer);
        console.log(`Aggregation service started on port ${options.port} and retrieving the last ${options.minutes} minutes of events from the Solid Pods located at the server ${options.SolidServer}.`);
        
    });


program.parse();
