import { createHash } from 'crypto'
const { exec } = require('child_process');
let ldfetch = require('ldfetch');
let ld_fetch = new ldfetch({});
const N3 = require('n3');

export function hash_string_md5(input_string: string) {
    input_string = input_string.replace(/\s/g, '');
    const hash = createHash('md5');
    hash.update(input_string);
    return hash.digest('hex');
}

export function measureExecutionTimeSync(func: () => void, component_name: string) {
    const start_time = new Date().getTime();
    func();
    const end_time = new Date().getTime();
    return {
        component_name,
        execution_time: end_time - start_time
    }
}

export async function measureExecutionTimeAsync(func: () => Promise<void>, component_name: string) {
    const start_time = new Date().getTime();
    await func();
    const end_time = new Date().getTime();
    return {
        component_name,
        execution_time: end_time - start_time
    }
}

export async function create_aggregator_pod(): Promise<boolean> {
    exec('npx community-solid-server --config src/server/aggregator-pod/config.json -f ./aggregation-data/ --seededPodConfigJson src/server/aggregator-pod/account.json', (err: any, stdout: any, stderr: any) => {
        if (stdout.code !== 0) {
            console.log('Error: Failed to create aggregator pod');
            return false;
        }
        else {
            return true;
        }
    })
    return true;
}

export function quick_sort(arr: string[]): string[] {
    if (arr.length <= 1) {
        return arr;
    }

    const pivot = arr[Math.floor(arr.length / 2)];
    const left: string[] = [];
    const right: string[] = [];
    const equal: string[] = [];

    for (const element of arr) {
        if (element < pivot) {
            left.push(element);
        } else if (element > pivot) {
            right.push(element);
        } else {
            equal.push(element);
        }
    }

    return [...quick_sort(left), ...equal, ...quick_sort(right)];
}

// TODO: sort it on the hashmap but will be faster.

export function insertion_sort(arr: string[]): string[] {
    const len = arr.length;

    for (let i = 1; i < len; i++) {
        const current = arr[i];
        let j = i - 1;

        while (j >= 0 && arr[j] > current) {
            arr[j + 1] = arr[j];
            j--;
        }

        arr[j + 1] = current;
    }

    return arr;
}

export async function find_relevant_streams(solid_pod_url: string, interest_metrics: string[]): Promise<string[]> {
    let relevant_streams: string[] = [];
    if (await if_exists_relevant_streams(solid_pod_url, interest_metrics)) {
        try {
            let public_type_index = await find_public_type_index(solid_pod_url);
            const response = await ld_fetch.get(public_type_index);
            let store = new N3.Store(await response.triples);
            for (let quad of store) {
                if (quad.predicate.value == "https://w3id.org/tree#view") {
                    relevant_streams.push(quad.object.value);
                }
            }
            return relevant_streams;
        }
        catch (error) {
            console.log(`Error: ${error}`);
            return relevant_streams;
        }

    }
    return relevant_streams;
}

export async function if_exists_relevant_streams(solid_pod_url: string, interest_metrics: string[]): Promise<boolean> {
    try {
        let public_type_index = await find_public_type_index(solid_pod_url);
        const response = await ld_fetch.get(public_type_index);
        let store = new N3.Store(await response.triples);
        for (let quad of store) {
            if (quad.predicate.value == "https://saref.etsi.org/core/relatesToProperty") {
                if (interest_metrics.includes(quad.object.value)) {
                    return true;
                }
            }
        }
        return false;
    }
    catch (error) {
        console.log(`Error: ${error}`);
        return false;
    }
}

export async function find_public_type_index(solid_pod_url: string): Promise<string> {
    let profie_document = solid_pod_url + "/profile/card";

    try {
        const response = await ld_fetch.get(profie_document);
        let store = new N3.Store(await response.triples);

        for (let quad of store) {
            if (quad.predicate.value == "http://www.w3.org/ns/solid/terms#publicTypeIndex") {
                return quad.object.value;
            };
        }

        console.log(`Could not find a public type index for ${solid_pod_url}`);
        return '';
    }
    catch (error) {
        console.log(`Error: ${error}`);
        return '';
    }
}