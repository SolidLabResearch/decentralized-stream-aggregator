import {LDESinLDP, LDPCommunication, SolidCommunication, filterRelation, ILDESinLDPMetadata, MetadataParser, extractDateFromLiteral} from "@treecg/versionawareldesinldp";
import {RateLimitedLDPCommunication} from "rate-limited-ldp-communication";
import { readMembersRateLimited } from "./ldes-in-ldp/EventSource";
const N3 = require('n3');

/**
 *
 */
async function main() {
    const ldes_location = 'http://n061-14a.wall2.ilabt.iminds.be:3000/participant6/bvp/';
    let counter = 0;
    const ldes = new LDESinLDP(ldes_location, new LDPCommunication());
    const until = new Date(1700038653238);
    const from = new Date(until.getTime());    
    const start = performance.now();
    const stream = await readMembersRateLimited({
        from: from,
        to: until,
        ldes: ldes,
        communication: new LDPCommunication(),
        rate: 100,
        interval: 1000
    })
    stream.on("data", (data: any) => {
        const stream_store = new N3.Store(data.quads);
        const store = stream_store.getQuads(null, null, null, null);
        for (const quad of store) {
            counter++;
        }
    });

    stream.on("end", () => {
        const end = performance.now();
        console.log(`The number of observations is `, counter / 6);
        console.log(`The query took ${end - start} milliseconds.`);
    });
}

main();
