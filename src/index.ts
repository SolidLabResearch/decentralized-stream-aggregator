
import { HTTPServer } from "./server/HTTPServer";
import * as bunyan from 'bunyan';
import * as fs from 'fs';
import stringify from 'csv-stringify/lib/sync';

const log_file = fs.createWriteStream('./logs/aggregation.log', { flags: 'a' });

const logger = bunyan.createLogger({
    name: 'solid-stream-aggregator',
    streams: [
        {
            level: 'info',
            stream: log_file
        },
    ],
    serializers: {
        log: (log_data: any) => {
            return {
                ...log_data,
                query_id: log_data.query_id || 'no_query_id',
            }
        }
    }
});


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
        '-ss --solid_server_url <SolidServer>',
        'The URL of the Solid Pod server where the LDES streams are stored in a Solid Pod',
        'http://localhost:3000/'
    )
    .action(async (options: any) => {
        new HTTPServer(options.port, options.SolidServer, logger);
    });

program.parse();



// ```
// 2023-09-05T13:24:30.888Z [ListeningActivityHandler] {Primary} error: Error trying to handle notification for http://localhost:3000/.notifications/WebSocketChannel2023/3a05c98d-4ab7-4be6-b2ad-e7bd24dc38e2: Lock expired after 6000ms on http://localhost:3000/aggregation_pod/aggregation_new/1692373487374
// ```  