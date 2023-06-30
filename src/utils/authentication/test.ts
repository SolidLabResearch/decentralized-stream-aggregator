import { getAuthenticatedSession, LDESinLDP, SolidCommunication } from "@treecg/versionawareldesinldp";
import {Session} from "@rubensworks/solid-client-authn-isomorphic";

async function main() {
    const token = await generateToken({
        email: 'dataset_participant1@protego.com',
        password: 'FxzNcJ',
        name: 'Solid-Stream-Aggregator',
        idp: 'http://localhost:3000/'
    });
    const credentials = {
        id: 'Solid-Stream-Aggregator_40ba28bf-5456-4695-8667-3622c4d2a786',
        secret: 'e86c382bc59683b83a074ddf67d41412410ebbb1a58869ec259564f8c46e9e1b2e1e06dc53d29f6c291d206e46e722868d475a9006f698483b7834a1914b6af2',
        idp: 'http://localhost:3000/'
    }
    // console.log(token);
    const session = await session_with_credentials(credentials);
    console.log(session.info.isLoggedIn);
    // if (session.info.isLoggedIn) {
    //     const ldes_in_ldp_identifier = "http://localhost:3000/dataset_participant1/data/"
    //     const communication = new SolidCommunication(session);        
    //     const ldes_in_ldp = new LDESinLDP(ldes_in_ldp_identifier, communication);
    //     const ldes = await ldes_in_ldp.readAllMembers();
    //     ldes.on("data", (data: any) => {
    //         // console.log(data); 
    //     });
        
    // }
}

export async function session_with_credentials(credentials: any): Promise<Session> {
    const session = new Session();
    try {
        session.fetch = await makeAuthenticatedFetch(credentials, fetch);
        session.info.isLoggedIn = true
    }
    catch (e:unknown) {
        const error = e as Error
        console.log(error);
    }

    return session;
}

main();


const N3 = require('n3');
const authn = require('@inrupt/solid-client-authn-core')
/**
 * @typedef {Object} CredentialsToken
 * @property {string} id - The token id.
 * @property {string} secret - The token secret.
 * @property {string} idp - The Identity Provider that granted the token.
 */
/**
 * Create a client credentials token for CSS v4.0.0 and higher.
 * @param {Object} options - Token creation options.
 * @param {string} options.name - The name for the token.
 * @param {string} options.webid - The user WebID.
 * @param {string} options.email - The user email.
 * @param {string} options.password - The user password.
 * @returns {CredentialsToken} - The resulting Client Credentials Token
 */
async function createAuthenticationTokenCSS(options: any) {
    options.idp = await getIdpFromWebID(options);
    const { id, secret } = await generateToken(options);
    return { id, secret, idp: options.idp }
}

async function getIdpFromWebID(options: any) {
    const parser = new N3.Parser({ baseIRI: options.webid });
    let idps = []

    const res = await fetch(options.webid, { headers: { 'Accept': 'text/turtle' } });
    const resText = await res.text();
    const quads = await parser.parse(resText)

    for (let quad of quads) {
        if (quad.predicate.value === "http://www.w3.org/ns/solid/terms#oidcIssuer" && quad.subject.value === options.webid) {
            idps.push(quad.object.value);
        }
    }

    if (idps.length === 0)
        throw new Error('No identity provider link found in WebID. This is mandatory by the Solid specification.')
    if (idps.length > 1)
        throw new Error('Multiple IDPs is not supported yet.')
    return idps[0]
}

async function generateToken(options: any) {
    // This assumes your server is started under http://localhost:3000/.
    // This URL can also be found by checking the controls in JSON responses when interacting with the IDP API,
    // as described in the Identity Provider section.
    const response = await fetch(`${options.idp}idp/credentials/`, { // TODO:: this link can be discovered from the .well-known file as well.
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // The email/password fields are those of your account.
        // The name field will be used when generating the ID of your token.
        body: JSON.stringify({ email: options.email, password: options.password, name: options.name }),
    });

    // These are the identifier and secret of your token.
    const tokenresponse = await response.json()
    if (!tokenresponse.id || !tokenresponse.secret) {
        throw new Error(`Could not generate client credentials: ${tokenresponse.statusCode} - ${tokenresponse.name}}. Please check the provided email and password.`)
    }
    return tokenresponse
}

/*********
 * Fetch *
 *********/

/**
 * Create an authenticated fetch function using a file with a CSS client credentials token for CSS v4.0.0 and higher.
 * @param {CredentialsToken} credentials - Client Credentials Token.
 * @param {Function} [fetch] - Optional fetch function to authenticate. Defaults to built-in fetch function.
 * @returns {Function} - The authenticated fetch function.
 */
async function makeAuthenticatedFetch(credentials: any, fetch: any) {
    const authFetch = await createAuthenticatedFetchFunction(credentials, fetch);
    return authFetch
}

async function createAuthenticatedFetchFunction(credentials: any, passedFetch: any) {
    const { id, secret, idp } = credentials;
    const fetchFunction = passedFetch || fetch

    // A key pair is needed for encryption.
    // This function from `solid-client-authn` generates such a pair for you.
    const dpopKey = await authn.generateDpopKeyPair();

    // These are the ID and secret generated in the previous step.
    // Both the ID and the secret need to be form-encoded.
    const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
    // This URL can be found by looking at the "token_endpoint" field at
    // http://localhost:3000/.well-known/openid-configuration
    // if your server is hosted at http://localhost:3000/.
    const tokenUrl = `${idp}.oidc/token`;
    const response = await fetchFunction(tokenUrl, {
        method: 'POST',
        headers: {
            // The header needs to be in base64 encoding.
            authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
            'content-type': 'application/x-www-form-urlencoded',
            dpop: await authn.createDpopHeader(tokenUrl, 'POST', dpopKey),
        },
        body: 'grant_type=client_credentials&scope=webid',
    });

    // This is the Access token that will be used to do an authenticated request to the server.
    // The JSON also contains an "expires_in" field in seconds,
    // which you can use to know when you need request a new Access token.
    const { access_token: accessToken } = await response.json();

    // The DPoP key needs to be the same key as the one used in the previous step.
    // The Access token is the one generated in the previous step.
    const authFetch = await authn.buildAuthenticatedFetch(fetchFunction, accessToken, { dpopKey });
    // authFetch can now be used as a standard fetch function that will authenticate as your WebID.
    // This request will do a simple GET for example.
    return authFetch
}

module.exports = { createAuthenticationTokenCSS, makeAuthenticatedFetch }