import { getAuthenticatedSession, LDESinLDP, SolidCommunication } from "@treecg/versionawareldesinldp";
import { session_with_credentials, generateToken } from "./css-auth";
import { performance, PerformanceObserver } from "perf_hooks";

async function main() {
    let counter = 0;
    const token = await generateToken({
        email: 'dataset_participant2@protego.com',
        password: 'KdxpVr',
        name: 'Solid-Stream-Aggregator',
        idp: 'http://localhost:3000/'
    });
    const credentials = {
        id: token.id,
        secret: token.secret,
        idp: 'http://localhost:3000/'
    }

    console.log(credentials);

    const session = await session_with_credentials(credentials);
    console.log(session.info.isLoggedIn);

    if (session.info.isLoggedIn) {
        const ldes_in_ldp_identifier = "http://localhost:3000/dataset_participant1/data/"
        const communication = new SolidCommunication(session);
        const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_identifier, communication);
        const ldes = await ldes_in_ldp.readAllMembers();
        performance.mark("start_reading");
        let time_start = performance.now();
        let time_end;
        ldes.on("data", (data) => {
            // console.log(data);
            counter++;
        });

        ldes.on("end", () => {
            console.log(counter);
            
            console.log("Stream ended");
            let time_end = performance.now();
        });
        console.log(counter);
        time_end = performance.now();
        console.log(time_end - time_start);
        

    }
}
main();