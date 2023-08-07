import { LDPCommunication , LDESinLDP} from "@treecg/versionawareldesinldp"
import { Store } from "n3";

async function main() {
const ldes_in_ldp_identifier = "http://localhost:3000/aggregation_pod/aggregation/";
const comm = new LDPCommunication();
const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_identifier, comm);
const ldes_stream = await ldes_in_ldp.readMembersSorted({
    from: new Date("2023-08-03T11:55:23.887Z"),
    until: new Date("2023-08-03T11:55:23.889Z"),
    chronological: true,
})
ldes_stream.on("data", async(data) => {    
    const store = new Store(data.quads);
    for await (const quad of store) {
        console.log(quad);
    }
});
}

main();

