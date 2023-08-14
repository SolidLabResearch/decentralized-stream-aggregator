import { LDPCommunication , LDESinLDP} from "@treecg/versionawareldesinldp"
import { Store } from "n3";

async function main() {
const ldes_in_ldp_identifier = "http://localhost:3000/aggregation_pod/aggregation/";
const comm = new LDPCommunication();
const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_identifier, comm);
const ldes_stream_read_mebers = await ldes_in_ldp.readAllMembers();
// const ldes_stream_read_mebers = await ldes_in_ldp.readAllMembers(new Date("2022-02-13T09:27:32.109Z"), new Date("2024-02-13T09:27:35.109Z"));
ldes_stream_read_mebers.on("data", async (data) => {
    console.log(data.quads);
    const store = new Store(data.quads);
    for await (const quad of store) {
        console.log(quad);
    }
});
}

main();

