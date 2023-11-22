import { LDESinLDP, LDPCommunication, extractLdesMetadata } from "@treecg/versionawareldesinldp";
let ldes_location = 'http://n061-14a.wall2.ilabt.iminds.be:3000/participant6/bvp-1s/';
import { readMembersRateLimited } from "./src/utils/ldes-in-ldp/EventSource"
let ldes_in_ldp = new LDESinLDP(ldes_location, new LDPCommunication());
let counter = 0;

async function test() {
    let stream = await readMembersRateLimited({
        ldes: ldes_in_ldp,
        rate: 30,
        communication: new LDPCommunication(),
        interval: 1000,
    })
    
    stream.on('data', (data) => {
        counter++;        
    });
    stream.on('end', () => {
        console.log(`The stream has ended.`);
        console.log(`The stream has emitted ${counter} data events.`);
    });
}

test()

