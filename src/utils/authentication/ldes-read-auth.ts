import { Session } from "@inrupt/solid-client-authn-node";
const { login, isLoggedin, getSession, getAuthenticatedSession } = require('@treecg/versionawareldesinldp')
// import { getAuthenticatedSession } from "css-auth-login";

const { SolidCommunication, LDESinLDP, VersionAwareLDESinLDP } = require("@treecg/versionawareldesinldp");

async function main() {
    const validatedOptions = {
        applicationName: "Solid-Stream-Aggregator",
        registrationType: "dynamic",
        solidIdentityProvider: "http://localhost:3000"
    };
    let session = await getAuthenticatedSession({
        webId: 'http://localhost:3000/dataset_participant1/profile/card#me',
        password: 'FxzNcJ',
        email: 'dataset_participant1@protego.com'
    });

    // let session = await getAuthenticatedSession({
    //     webId: 'http://localhost:3000/dataset_participant1/profile/card#me',
    //     password: 'random',
    //     email: 'dataset_participant1@protego.com',
    // })
    // session.info.isLoggedIn = true;
    
    await login(validatedOptions, session)
    if (session.info.isLoggedIn) {
        const ldes_in_ldp_identifier = "http://localhost:3000/dataset_participant1/data/"
        const communication = new SolidCommunication(session);        
        const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_identifier, communication);
        const ldes = await ldes_in_ldp.readAllMembers();
        ldes.on("data", (data: any) => {
            console.log(data); 
        });
        
    }
}



main();
