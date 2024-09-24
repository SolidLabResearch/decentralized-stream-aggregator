import { HTTPServer } from "./server/HTTPServer";
import * as bunyan from 'bunyan';
import * as fs from 'fs';
import * as path from 'path';

function getTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
}

function getAndUpdateIteration() {
    const iterationFilePath = path.join(__dirname, '/logs/iteration.txt');
    let iteration = 1;
    if (fs.existsSync(iterationFilePath)) {
        iteration = parseInt(fs.readFileSync(iterationFilePath, 'utf8'), 10) + 1;
    }
    else {
        fs.mkdirSync(path.join(__dirname, '/logs'));
    }
    fs.writeFileSync(iterationFilePath, iteration.toString());
    return iteration;
}

const iteration = getAndUpdateIteration();
const timestamp = getTimestamp();

const log_file = fs.createWriteStream(`/logs/aggregator-${iteration}-${timestamp}.log`, { flags: 'a' });


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
