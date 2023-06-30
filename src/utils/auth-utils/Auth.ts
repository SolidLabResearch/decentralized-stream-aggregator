/***************************************
 * Title: Login.ts
 * Description: Logs the user in
 * Author: Wout Slabbinck (wout.slabbinck@ugent.be)
 * Created on 26/11/2021
 *****************************************/

import {readdirSync, readFileSync, unlinkSync, writeFileSync} from "fs";
import Path from "path";
import {ILoginInputOptions, InMemoryStorage, Session} from "@rubensworks/solid-client-authn-isomorphic";

import {config} from 'dotenv';
import express from "express";
import {buildAuthenticatedFetch, createDpopHeader, generateDpopKeyPair} from "@inrupt/solid-client-authn-core";
import {LDPCommunication} from "@treecg/versionawareldesinldp";
import {turtleStringToStore} from "@treecg/ldes-snapshot";
import {SOLID} from "@solid/community-server";

config();

export enum RegistrationType {
    Static = "static",
    Dynamic = "dynamic"
};

type InputOptions = {
    solidIdentityProvider: string;
    applicationName?: string;
    registrationType: RegistrationType; // not used?
};

export async function login(validatedOptions: InputOptions): Promise<void> {
    const app = express();
    const port = 3123;
    const iriBase = `http://localhost:${port}`;
    const storage = new InMemoryStorage();

    const session: Session = new Session({
        insecureStorage: storage,
        secureStorage: storage,
    });

    const server = app.listen(port, async () => {
        console.log(`Listening at: [${iriBase}].`);
        const loginOptions: ILoginInputOptions = {
            clientName: validatedOptions.applicationName,
            oidcIssuer: validatedOptions.solidIdentityProvider,
            redirectUrl: iriBase,
            tokenType: "DPoP",
            handleRedirect: (url: string) => {
                console.log(`\nPlease visit ${url} in a web browser.\n`);
            },
        };
        console.log(
            `Logging in to Solid Identity Provider  ${validatedOptions.solidIdentityProvider} to get a refresh token.`
        );

        session.login(loginOptions).catch((e) => {
            throw new Error(
                `Logging in to Solid Identity Provider [${validatedOptions.solidIdentityProvider
                }] failed: ${e.toString()}`
            );
        });
    });

    app.get("/", async (_req: {url: string | URL;}, res: {send: (arg0: string) => void;}) => {
        const redirectIri = new URL(_req.url, iriBase).href;
        console.log(
            `Login into the Identity Provider successful, receiving request to redirect IRI [${redirectIri}].`
        );
        await session.handleIncomingRedirect(redirectIri);
        // NB: This is a temporary approach, and we have work planned to properly
        // collect the token. Please note that the next line is not part of the public
        // API, and is therefore likely to break on non-major changes.
        const rawStoredSession = await storage.get(
            `solidClientAuthenticationUser:${session.info.sessionId}`
        );
        if (rawStoredSession === undefined) {
            throw new Error(
                `Cannot find session with ID [${session.info.sessionId}] in storage.`
            );
        }
        const storedSession = JSON.parse(rawStoredSession);
        console.log(`
These are your login credentials:
{
  "refreshToken" : "${storedSession.refreshToken}",
  "clientId"     : "${storedSession.clientId}",
  "clientSecret" : "${storedSession.clientSecret}",
  "issuer"       : "${storedSession.issuer}",
}
`);
        res.send(
            "The tokens have been sent to @inrupt/generate-oidc-token. You can close this window."
        );

        // write session away
        writeFileSync(Path.join(__dirname, 'config.json'), JSON.stringify(storedSession));

        server.close();
    });
}

/**
 * Function only stops when a config file is created -> indicating that a user is logged in
 */
export async function isLoggedin(): Promise<void> {
    const rootPath = __dirname;
    let loggedIn = false;
    while (!loggedIn) {
        const files = readdirSync(rootPath);
        if (files.includes('config.json')) {
            loggedIn = true;
            break;
        }
        await sleep(1000);
    }
}

export async function getSession(): Promise<Session> {
    const configPath = Path.join(__dirname, 'config.json');
    const credentials = JSON.parse(readFileSync(configPath, 'utf-8'));

    const session = new Session();
    session.onNewRefreshToken((newToken: string): void => {
        console.log("New refresh token: ", newToken);
    });
    await session.login({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        refreshToken: credentials.refreshToken,
        oidcIssuer: credentials.issuer,
    });
    unlinkSync(configPath);
    return session;
}

export function sleep(ms: number): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates an authenticated fetch using the mail, password and the IDP URL of the given pod.
 * TODO: create one that uses the webid and https://github.com/SolidLabResearch/SolidLabLib.js getIdentityProvider method
 *
 * This method has only been tested for CSS v5.0.0
 * e.g. of an IDP URL: http://localhost:3000/idp/
 * @param config
 */
async function authenticatedFetch(config: { email: string, password: string, idp: string, tokenEndpoint?: string }): Promise<(input: RequestInfo | URL, init?: RequestInit | undefined) => Promise<Response>> {
    // fetch id and secret from the client credentials.
    const {email, password, idp} = config
    const tokenUrl = config.tokenEndpoint ?? new URL(idp).origin + "/.oidc/token" // note: can retrieve it from {server}/.well-known/openid-configuration (e.g. http://localhost:3000/.well-known/openid-configuration)
    const idpResponse = await fetch(idp)

    // only if 200
    const idpjson = await idpResponse.json()

    const credentialURL = idpjson.controls.credentials
    // throw error if undefined (credentialURL)
    const credentialsResponse = await fetch(credentialURL, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({email: email, password: password, name: 'my-token'}),
    });

    // only if 200
    const {id, secret} = await credentialsResponse.json();


    // Requesting an access token.
    const dpopKey = await generateDpopKeyPair();
    const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            // The header needs to be in base64 encoding.
            authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
            'content-type': 'application/x-www-form-urlencoded',
            dpop: await createDpopHeader(tokenUrl, 'POST', dpopKey),
        },
        body: 'grant_type=client_credentials&scope=webid',
    });
    const {access_token: accessToken, expires_in: expires} = await response.json();
    // https://communitysolidserver.github.io/CommunitySolidServer/5.x/usage/client-credentials/#requesting-an-access-token
    // 'The JSON also contains an "expires_in" field in seconds'

    if (accessToken === undefined) {
        throw Error("Authentication failed: password or email are wrong for idp: "+idp)
    }
    console.log("token expires in:", expires, "seconds.")
    // it says types don't match, but they should
    // @ts-ignore
    return await buildAuthenticatedFetch(fetch, accessToken, {dpopKey});
}


async function getIdp(webID: string): Promise<string> {
    const response = await new LDPCommunication().get(webID)
    const store = await turtleStringToStore(await response.text())
    const idp = store.getQuads(webID, SOLID.oidcIssuer,null,null)[0].object.value
    return idp + 'idp/' // Note: don't know if that should or should not be added.
}

/**
 * Retrieve a {@link Session} containing only an authenticated fetch method.
 * Only applicable for CSS v5.1.0 and up.
 *
 * @param config
 */
export async function getAuthenticatedSession(config: { webId: string, email: string, password: string }): Promise<Session> {
    const {email, password} = config
    const idp = await getIdp(config.webId);     // TODO: use getIdentityProvider from https://github.com/SolidLabResearch/SolidLabLib.js
    const session = new Session()
    try {
        session.fetch = await authenticatedFetch({email, password, idp});
        session.info.isLoggedIn = true
        session.info.webId = config.webId
    } catch (e:unknown) {
        const error = e as Error
        console.log("Log in not successful for webID: "+config.webId)
        console.log(error.message)
        // fetch is part of session and will have a non-authenticated fetch method
    }

    return session;
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
    return { id, secret, idp: options.idp}
}

async function getIdpFromWebID(options:any) { 
    const parser = new N3.Parser({baseIRI: options.webid});
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

async function generateToken(options:any) { 
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
async function makeAuthenticatedFetch(credentials:any, fetch:any) { 
    const authFetch = await createAuthenticatedFetchFunction(credentials, fetch);
    return authFetch
}

async function createAuthenticatedFetchFunction(credentials:any, passedFetch:any) { 
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