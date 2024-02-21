const { exec } = require('child_process');
/**
 * Class for creating a solid pod for the aggregator.
 * @class AggregatorPod
 */
export class AggregatorPod{
    /**
     * Creates an instance of AggregatorPod.
     * @memberof AggregatorPod
     */
    constructor(){
        this.create_solid_pod();
    }
    /**
     * Creates a solid pod for the aggregator.
     * @returns {Promise<void>} - The solid pod is created but the return is void.
     * @memberof AggregatorPod
     */
    public async create_solid_pod(): Promise<void>{
        exec('npx community-solid-server --config src/server/aggregator-pod/config.json -f ./aggregation-data/ --seededPodConfigJson src/server/aggregator-pod/account.json', (err: any) => {
            if (err) {
                console.error(err);
                return;
            }
            return true;
        });
    }
}
