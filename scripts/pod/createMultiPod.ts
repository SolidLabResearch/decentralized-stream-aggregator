const fs = require('fs')
const generator = require('generate-password')
const jsonFile = require('jsonfile')
const directory: string = '/home/kush/Code/stream-aggregator-solid/data'
import { Logger, ILogObj } from "tslog";
let logger: Logger<ILogObj> = new Logger();
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

export class prepareSolidPod {

    async listFile(path: string) {
        const dir = await fs.promises.opendir(path)
        for await (const value of dir) {
            let fileName: string = value.name.slice(0, -3)
            let solidObject = {
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

    async writeJSONFile(object: multipod[]) {
        for await (const { } of object) {
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