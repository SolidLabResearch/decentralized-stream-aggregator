import { getAuthenticatedSession, LDESinLDP, SolidCommunication } from "@treecg/versionawareldesinldp";
import { session_with_credentials, generateToken } from "./css-auth";

async function main() {
    const token = await generateToken({
        email: 'dataset_participant1@protego.com',
        password: 'FxzNcJ',
        name: 'Solid-Stream-Aggregator',
        idp: 'http://localhost:3000/'
    });
    const credentials = {
        id: token.id,
        secret: token.secret,
        idp: 'http://localhost:3000/'
    }
    console.log(token.id);
    
    const session = await session_with_credentials(credentials);
    console.log(session.info.isLoggedIn);
    
    if (session.info.isLoggedIn) {
        const ldes_in_ldp_identifier = "http://localhost:3000/dataset_participant1/data/"
        const communication = new SolidCommunication(session);   
        const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_identifier, communication);
        const ldes = await ldes_in_ldp.readAllMembers();

        ldes.on("data", (data) => {
            console.log(data);
        });
    }
}
main();