import { LDPCommunication , LDESinLDP} from "@treecg/versionawareldesinldp"
import { Store } from "n3";

async function main() {
const ldes_in_ldp_identifier = "http://localhost:3000/dataset_participant1/data/"
const comm = new LDPCommunication();
const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_identifier, comm);
const ldes_stream = await ldes_in_ldp.readAllMembers();
ldes_stream.on("data", async(data) => {
    const store = new Store(data.quads);
    for await (const quad of store) {
        console.log(quad);
    }
});
}

main();

