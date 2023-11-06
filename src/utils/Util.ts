import {createHash} from 'crypto'
const { exec } = require('child_process');

export function hash_string_md5(input_string:string) {
    input_string = input_string.replace(/\s/g, '');
    const hash = createHash('md5');
    hash.update(input_string);
    return hash.digest('hex');
}

export function measureExecutionTimeSync(func: () => void, component_name:string){
    const start_time = new Date().getTime();
    func();
    const end_time = new Date().getTime();
    return {
        component_name,
        execution_time: end_time - start_time
    }
}

export async function measureExecutionTimeAsync(func: () => Promise<void>, component_name: string){
    const start_time = new Date().getTime();
    await func();
    const end_time = new Date().getTime();
    return {
        component_name,
        execution_time: end_time - start_time
    }
}

export async function create_aggregator_pod(): Promise<boolean>{
    exec('npx community-solid-server --config src/server/aggregator-pod/config.json -f ./aggregation-data/ --seededPodConfigJson src/server/aggregator-pod/account.json', (err: any, stdout: any, stderr: any) => {
        if (stdout.code !== 0) {
            console.log('Error: Failed to create aggregator pod');
            return false;
        }
        else {
            return true;
        }
    })
    return true;}
    // if (exec('npx community-solid-server --config src/server/aggregator-pod/config.json -f ./aggregation-data/ --seededPodConfigJson src/server/aggregator-pod/account.json').code !== 0) {
    //     console.log('Error: Failed to create aggregator pod');
    //     return false;
    // }
    // return true;
    // return exec('npx community-solid-server --config src/server/aggregator-pod/config.json -f ./aggregation-data/ --seededPodConfigJson src/server/aggregator-pod/account.json', (err: any, stdout: any, stderr: any) => {
    //     if (err) {
    //         console.error(err);
    //         return true;
    //     }
    // }
    // )}