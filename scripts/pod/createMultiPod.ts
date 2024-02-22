const fs = require('fs')
const generator = require('generate-password')
const jsonFile = require('jsonfile')
const directory: string = '/home/kush/Code/stream-aggregator-solid/data'
import { Logger, ILogObj } from "tslog";
const logger: Logger<ILogObj> = new Logger();
const mailDomain: string = '@protego.com'

type multipod = {
    pod_name: string,
    email: string,
    password: string
}

type myType = {
    solidpod: multipod[];
}

const fileObject: myType = {
    solidpod: [],
};
/**
 * Class for preparing the solid pods for the multi-pod setup.
 * @class prepareSolidPod
 */
export class prepareSolidPod {
    /**
     * Lists the files in the directory and creates a solid pod's email and password for each file.
     * @param {string} path - The path to the directory.
     * @memberof prepareSolidPod
     */
    async listFile(path: string) {
        const dir = await fs.promises.opendir(path)
        for await (const value of dir) {
            const fileName: string = value.name.slice(0, -3)
            const solidObject = {
                pod_name: fileName,
                email: fileName + mailDomain,
                password: generator.generate({
                    length: 6,
                    numbers: false,
                    excludeSimilarCharacters: true
                })
            }
            fileObject.solidpod.push(solidObject);
        }
    }
    /**
     * Writes the JSON file with the solid pod credentials.
     * @param {multipod[]} object - The object to write to the JSON file.
     * @memberof prepareSolidPod
     */
    async writeJSONFile(object: multipod[]) {
        for await (const pod of object) {
            console.log(`The pod name is ${pod.pod_name}`);
            const podContent: string = JSON.stringify(fileObject.solidpod)
            jsonFile.writeFile('pod_credentials.json', JSON.parse(podContent), function (error: string) {
                if (error) {
                    logger.error(`The error is ${error}`);
                }
                logger.info('complete.')
            })
        }
    }
}

const something = new prepareSolidPod();
something.listFile(directory).then(() => {
    something.writeJSONFile(fileObject.solidpod);
}).catch(error => {
    logger.error(error);
})