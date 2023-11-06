import { LDPCommunication, LDESinLDP } from "@treecg/versionawareldesinldp";
import { readMembersRateLimited } from "./ldes-in-ldp/EventSource";

async function main(){
    // fetch("http://n061-14a.wall2.ilabt.iminds.be:3000/participant6/bvp/").then(async (response) => {
        // console.log(await response.text());
    // });
    let ldes = new LDESinLDP("http://n061-14a.wall2.ilabt.iminds.be:3000/participant6/bvp/", new LDPCommunication());
    // const ldes = new LDESinLDP("http://localhost:3000/dataset_participant1/data/", new LDPCommunication())
    const stream = await readMembersRateLimited({
        ldes: ldes,
        communication: new LDPCommunication(),
        rate: 10
    });
    // const stream = await ldes.readAllMembers();
    stream.on('data', (data) => {
        console.log(data);
    });
}

main();