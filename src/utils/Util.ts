import { createHash } from 'crypto'
const { exec } = require('child_process');
const ldfetch = require('ldfetch');
const ld_fetch = new ldfetch({});
const N3 = require('n3');

/**
 * Hash a string using the MD5 algorithm.
 * @param {string} input_string - The input string to be hashed.
 * @returns {string} - The hashed string.
 */
export function hash_string_md5(input_string: string) {
    input_string = input_string.replace(/\s/g, '');
    const hash = createHash('md5');
    hash.update(input_string);
    return hash.digest('hex');
}

/**
 * Measure the execution time of a function.
 * @param {void} func - The function to be measured.
 * @param {string} component_name - The name of the component.
 * @returns {object} - The execution time of the function.
 */
export function measureExecutionTimeSync(func: () => void, component_name: string) {
    const start_time = new Date().getTime();
    func();
    const end_time = new Date().getTime();
    return {
        component_name,
        execution_time: end_time - start_time
    }
}

/**
 * Measure the execution time of a function which is asynchronous.
 * @param {void} func - The function to be measured.
 * @param {string} component_name - The name of the component.
 * @returns {object} - The execution time of the function.
 */
export async function measureExecutionTimeAsync(func: () => Promise<void>, component_name: string) {
    const start_time = new Date().getTime();
    await func();
    const end_time = new Date().getTime();
    return {
        component_name,
        execution_time: end_time - start_time
    }
}

/**
 * Create an aggregator pod.
 * @returns {Promise<boolean>} - Returns true if the aggregator pod was created successfully, otherwise false.
 */
export async function create_aggregator_pod(): Promise<boolean> {
    exec('npx community-solid-server --config src/server/aggregator-pod/config.json -f ./aggregation-data/ --seededPodConfigJson src/server/aggregator-pod/account.json', (err: any, stdout: any) => {
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

/**
 * Sort an array using the quick sort algorithm.
 * @param {string[]} arr - The array to be sorted.
 * @returns {string[]} - The sorted array.
 */
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


/**
 * Sort an array using the insertion sort algorithm.
 * @param {string[]} arr - The array to be sorted.
 * @returns {string[]} - The sorted array.
 */
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

/**
 * Find relevant streams in a Solid Pod.
 * @param {string} solid_pod_url - The URL of the Solid Pod.
 * @param {string[]} interest_metrics - The array of interest metrics which are relevant and being searched inside the aggregator pod.
 * @returns {Promise<string[]>} - The relevant streams.
 */
export async function find_relevant_streams(solid_pod_url: string, interest_metrics: string[]): Promise<string[]> {
    const relevant_streams: string[] = [];
    if (await if_exists_relevant_streams(solid_pod_url, interest_metrics)) {
        try {
            const public_type_index = await find_public_type_index(solid_pod_url);
            const response = await ld_fetch.get(public_type_index);
            const store = new N3.Store(await response.triples);
            for (const quad of store) {
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

/**
 * Check if relevant streams exist in a Solid Pod.
 * @param {string} solid_pod_url - The URL of the Solid Pod.
 * @param {string[]} interest_metrics - The array of interest metrics which are relevant and being searched inside the aggregator pod.
 * @returns {Promise<boolean>} - Returns true if relevant streams exist, otherwise false.
 */
export async function if_exists_relevant_streams(solid_pod_url: string, interest_metrics: string[]): Promise<boolean> {
    try {
        const public_type_index = await find_public_type_index(solid_pod_url);
        const response = await ld_fetch.get(public_type_index);
        const store = new N3.Store(await response.triples);
        for (const quad of store) {
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

/**
 * Find the public type index of a Solid Pod.
 * @param {string} solid_pod_url - The URL of the Solid Pod.
 * @returns {Promise<string>} - The public type index.
 */
export async function find_public_type_index(solid_pod_url: string): Promise<string> {
    const profie_document = solid_pod_url + "/profile/card";

    try {
        const response = await ld_fetch.get(profie_document);
        const store = new N3.Store(await response.triples);

        for (const quad of store) {
            if (quad.predicate.value == "http://www.w3.org/ns/solid/terms#publicTypeIndex") {
                return quad.object.value;
            }
        }

        console.log(`Could not find a public type index for ${solid_pod_url}`);
        return '';
    }
    catch (error) {
        console.log(`Error: ${error}`);
        return '';
    }
}