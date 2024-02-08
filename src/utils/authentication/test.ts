import { getAuthenticatedSession, LDESinLDP, LDPCommunication, SolidCommunication } from "@treecg/versionawareldesinldp";
import { session_with_credentials, generateToken } from "./css-auth";
import { performance, PerformanceObserver } from "perf_hooks";
const n3 = require('n3');
import { storeToString } from "@treecg/versionawareldesinldp";
import { readMembersRateLimited } from "../ldes-in-ldp/EventSource";

/**
 *
 */
async function main() {
    let counter = 0;
    // const token = await generateToken({
    //     email: 'dataset_participant2@protego.com',
    //     password: 'KdxpVr',
    //     name: 'Solid-Stream-Aggregator',
    //     idp: 'http://localhost:3000/'
    // });
    // const credentials = {
    //     id: token.id,
    //     secret: token.secret,
    //     idp: 'http://localhost:3000/'
    // }

    // console.log(credentials);

    // const session = await session_with_credentials(credentials);
    // console.log(session.info.isLoggedIn);

    if (true) {
        const ldes_in_ldp_identifier = "http://localhost:3000/dataset_participant1/data/"
        // const ldes_in_ldp_identifier = "http://n061-14a.wall2.ilabt.iminds.be:3000/participant6/bvp-10min/"
        // const communication = new SolidCommunication(session);
        const communication = new LDPCommunication();
        const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_identifier, communication);
        // const ldes = await ldes_in_ldp.readAllMembers();


        const ldes = await readMembersRateLimited({
            ldes: ldes_in_ldp,
            communication: new LDPCommunication(),
            rate: 20,
            interval: 1000
        })

        performance.mark("start_reading");
        const time_start = performance.now();
        let time_end;
        ldes.on("data", (data) => {
            // const store = new n3.Store(data.quads);
            // console.log(storeToString(store));
            console.log(counter);
            counter++;
        });

        ldes.on("end", () => {
            console.log(counter);
            console.log("Stream ended");
            const time_end = performance.now();
        });        

    }
}
main();