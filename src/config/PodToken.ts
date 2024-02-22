import * as fs from 'fs';
import { generateToken } from "../utils/authentication/CSSAuthentication"

export type auth_object = {
    email: string,
    password: string,
    name_of_service: string,
    idp: string
}

export type css_credentials = {
    id: string,
    secret: string,
    idp: string
}


/**
 * Create a client credentials token for CSS v4.0.0 and higher from the file.
 * @param {string} json_file - The file containing the credentials.
 * @param {string} service_name - The service name (e.g. Solid-Stream-Aggregator in our case).
 * @param {string} identity_provider - The identity provider.
 * @returns {Map<string, css_credentials>} - The resulting map of credentials.
 */
export async function create_authentication_token_css(json_file: string, service_name: string, identity_provider: string): Promise<Map<string, css_credentials>> {
    const auth_token_map = new Map<string, css_credentials>();
    const json_string = fs.readFileSync(json_file, 'utf8');
    const data = JSON.parse(json_string);
    for (const cred of data) {
        const token = await generateToken({
            email: cred.email,
            password: cred.password,
            name: service_name,
            idp: identity_provider
        });
        const credentials = {
            id: token.id,
            secret: token.secret,
            idp: identity_provider
        }
        auth_token_map.set(cred.email, credentials);

    }
    return auth_token_map;
}

create_authentication_token_css('src/config/pod_authentication.json', 'Solid-Stream-Aggregator', 'http://localhost:3000/');
