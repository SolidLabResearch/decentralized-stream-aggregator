import { LDESinLDP, LDPCommunication } from "@treecg/versionawareldesinldp";
// const pod_location_bvp = "http://n061-14a.wall2.ilabt.iminds.be:3000/participant6/bvp/";
const pod_location_bvp = "http://localhost:3000/dataset_participant1/xyz/";

/**
 * Main function.
 */
async function main() {
    let counter = 0;
    const ldes = new LDESinLDP(pod_location_bvp, new LDPCommunication());
    const stream = await ldes.readAllMembers();
    stream.on("data", (data) => {
        console.log(data.quads);
        counter++;
    });

    stream.on("end", () => {
        console.log(counter);
    });
}

main();