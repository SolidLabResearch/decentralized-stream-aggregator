import * as fs from 'fs';
import * as readline from 'readline';
import * as csv from 'csv-writer';

interface LogEntry {
    msg: string;
    time: string;
}

interface TimeDiffData {
    msg1: string;
    time1: string;
    msg2: string;
    time2: string;
    time_difference_seconds: number;
}

function processLog(logFilePath: string, outputCsvPath: string): void {
    const logs: LogEntry[] = [];
    const lineReader = readline.createInterface({
        input: fs.createReadStream(logFilePath),
    });

    lineReader.on('line', (line: string) => {
        const logEntry: LogEntry = JSON.parse(line);
        logs.push(logEntry);
    });

    lineReader.on('close', () => {
        // Sort logs by time
        logs.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        const timeDiffData: TimeDiffData[] = [];

        for (let i = 1; i < logs.length; i++) {
            const time1 = new Date(logs[i - 1].time);
            const time2 = new Date(logs[i].time);
            const timeDiff = (time2.getTime() - time1.getTime()) / 1000; // Convert milliseconds to seconds

            // Add relevant information to the timeDiffData array
            timeDiffData.push({
                msg1: logs[i - 1].msg,
                time1: logs[i - 1].time,
                msg2: logs[i].msg,
                time2: logs[i].time,
                time_difference_seconds: timeDiff,
            });
        }

        // Write the time differences to a CSV file
        const csvWriter = csv.createObjectCsvWriter({
            path: outputCsvPath,
            header: [
                { id: 'msg1', title: 'Message 1' },
                { id: 'msg2', title: 'Message 2' },
                { id: 'time_difference_seconds', title: 'Time Difference (seconds)' },
            ],
        });

        csvWriter.writeRecords(timeDiffData)
            .then(() => console.log('CSV file written successfully'))
            .catch((err) => console.error(err));
    });
}

const logFilePath = '/home/kush/Code/solid-stream-aggregator/logs/aggregation.log';
const outputCsvPath = '/home/kush/Code/solid-stream-aggregator/module_processing_time.csv';

processLog(logFilePath, outputCsvPath);
