const { exec } = require('child_process');

export class AggregatorPod{
    constructor(){
        this.create_solid_pod();
    }

    public async create_solid_pod(): Promise<void>{
        exec('npx community-solid-server --config src/server/aggregator-pod/config.json -f ./aggregation-data/ --seededPodConfigJson src/server/aggregator-pod/account.json', (err: any, stdout: any, stderr: any) => {
            if (err) {
                console.error(err);
                return;
            }
            return true;
        });
    }
}
