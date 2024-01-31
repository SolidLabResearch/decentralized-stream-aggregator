import { GETHandler } from '../../../src/server/GETHandler';
import { QueryRegistry } from '../../../src/service/query-registry/QueryRegistry';
import { EndpointQueries } from '../../../src/server/EndpointQueries';
import { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';

jest.mock('fs');

describe('GETHandler', () => {
    let req: IncomingMessage;
    let res: ServerResponse;
    let solid_server_url: string;
    let query_registry: QueryRegistry;
    let endpoint_queries: EndpointQueries;
    let latest_minutes: number;
    let logger: any;

    beforeEach(() => {
        req = {} as IncomingMessage;
        res = {} as ServerResponse;
        solid_server_url = 'mockSolidServerUrl';
        query_registry = {} as QueryRegistry;
        endpoint_queries = {} as EndpointQueries;
        latest_minutes = 5;
        logger = jest.fn();
    });

    it('handles request with valid URL', async () => {
        req.url = '/example';
        await GETHandler.handle(req, res, solid_server_url, query_registry, endpoint_queries, latest_minutes, logger);
        // Add your assertions for the valid URL case
    });

    it('handles request with undefined URL', async () => {
        req.url = undefined;
        const readFileSyncMock = jest.spyOn(fs, 'readFileSync').mockReturnValue('mockedFileContent');
        await GETHandler.handle(req, res, solid_server_url, query_registry, endpoint_queries, latest_minutes, logger);
        expect(readFileSyncMock).toHaveBeenCalledWith('dist/static/index.html');
        // Add your assertions for the undefined URL case
    });
});
