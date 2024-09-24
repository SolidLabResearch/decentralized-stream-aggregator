const { spawn } = require('child_process');
import * as fs from 'fs';
const child = spawn('npm', ['run', 'start', 'aggregation'], {
    stdio: 'inherit',
    shell: true
});

function getTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
}

interface MemoryUsage {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
}

function logCPUMemoryUsage(logFile: string) {
    const cpuUsage = process.cpuUsage();
    const memoryUsage: MemoryUsage = process.memoryUsage();
    const timestamp = Date.now();
    const logData = `${timestamp},${cpuUsage.user},${cpuUsage.system},${memoryUsage.rss},${memoryUsage.heapTotal},${memoryUsage.heapUsed},${memoryUsage.external}\n`;
    fs.appendFileSync(logFile, logData)
}
const timestamp = getTimestamp();
const logFile = `stream-aggregator-resource-usage-${timestamp}.csv`;
fs.writeFileSync(logFile, 'timestamp,cpu_user,cpu_system,rss,heapTotal,heapUsed,external\n');

setInterval(() => {
    logCPUMemoryUsage(logFile);
}, 500);

child.on('exit', (code: any) => {
    console.log(`Child process exited with code ${code}`);
    process.exit(code);
});

child.on('error', (err: any) => {
    console.log(`Child process error: ${err}`);
    process.exit(1);
});