import { absoluteFilePath, AppRunner, App } from "@solid/community-server";
import type { IComponentsManagerBuilderOptions } from "componentsjs";

const app_runner = new AppRunner();

const loader_properties: IComponentsManagerBuilderOptions<App> = {
    mainModulePath: absoluteFilePath('.'),
    typeChecking: false,
};

const configuration_variables = {
    'urn:solid-server:default:variable:showStackTrace': true,
    'urn:solid-server:default:variable:port': 3000,
    'urn:solid-server:default:variable:baseUrl': 'http://localhost:3000/',
    'urn:solid-server:default:variable:loggingLevel': 'Info',
    'urn:solid-server:default:variable:seededPodConfigJson': null,
};


export class CSSServer {
    public app: App | undefined;

    public async start(configuration_file: string) {
        this.app = await app_runner.create(loader_properties, configuration_file, configuration_variables);
        await this.app.start();
    }

    public async stop() {
        if (this.app) {
            await this.app.stop();
        }
    }
}
