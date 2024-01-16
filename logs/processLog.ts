import * as fs from 'fs';

interface LogEntry {
    query_id: string,
    msg: string,
    time: string,
}

export function process_log(file_path: string): void {
    const log_data: LogEntry[] = [];
    const module_processing_time: {
        [key: string]: number[]
    } = {};

    const data = fs.readFileSync(file_path, 'utf8');
    const logs = data.split('\n');

    logs.forEach((log) => {
        if (log.trim() !== '') {
            const log_entry: LogEntry = JSON.parse(log);
            log_data.push(log_entry);
        }
    });

    log_data.forEach((entry) => {
        const message = entry.msg;
        const log_time = new Date(entry.time);

        if (!module_processing_time[message]) {
            module_processing_time[message] = [];
        }

        module_processing_time[message].push(log_time.getTime());
    });

    const csv_data: string[][] = [[
        'event',
        'processing_time',
    ]];

    for (const module_name in module_processing_time) {
        const processing_times = module_processing_time[module_name];
        let total_processing_time = 0;

        for (let i = 1; i < processing_times.length; i++) {
            const time_difference = processing_times[i] - processing_times[i - 1];
            total_processing_time += time_difference;
        }

        const average_processing_time = processing_times.length <= 1 ? total_processing_time : total_processing_time / (processing_times.length - 1);
        csv_data.push([module_name, average_processing_time.toFixed(2)]);
    }

    const csv_file_path = 'module_processing_time.csv';
    const csv_content = csv_data.map((row) => row.join(',')).join('\n');
    fs.writeFileSync(csv_file_path, csv_content);
    console.log(`CSV file generated at ${csv_file_path}`);
}

process_log('/home/kush/Code/solid-stream-aggregator/logs/aggregation.log');

