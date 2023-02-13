import { Logger } from "tslog"
const fs = require('fs')
const generator = require('generate-password')
const jsonFile = require('jsonfile')
const directory: string = '/home/kush/Code/stream-aggregator-solid/data'

const logging: Logger = new Logger();

const mailDomain: string = '@protego.com'

type multipod = {
    podName: string,
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
                podName: fileName,
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
        for await (const {} of object) {
            const podContent: string = JSON.stringify(fileObject.solidpod)
            jsonFile.writeFile('multiSolidPod.json', JSON.parse(podContent), function (error: string) {
                if (error) {
                    throw new Error("The error is" + error);
                }
                logging.info('complete.')
            })
        }
    }
}

const something = new prepareSolidPod();
something.listFile(directory).then(() => {
    something.writeJSONFile(fileObject.solidpod);
}).catch(error => {
    console.log(error);
})