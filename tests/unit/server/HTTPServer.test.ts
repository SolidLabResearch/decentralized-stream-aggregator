import { HTTPServer } from '../../../src/server/HTTPServer';
import * as http from 'http';
import * as websocket from 'websocket';

const mock_logger = {
    info: jest.fn(),
    error: jest.fn()
}

// starting a mock http server for testing.
const mock_http_server = http.createServer((req, res) => { });
const mock_websocket_server = new websocket.server({
    httpServer: mock_http_server
});


jest.mock('./WebSocketHandler', () => {
    return jest.fn().mockImplementation(() => {
        return {
            handle_wss: jest.fn(),
            aggregation_event_publisher: jest.fn()
        };
    });
});

describe('HTTPServer', () => {
    let server;
    const mock_port = 8085;
    const mock_solid_server_url = 'http://localhost:3000/';

    beforeAll(() => {
        server = new HTTPServer(mock_port, mock_solid_server_url, mock_logger);
        server['http_server'] = mock_http_server;
        server['websocket_server'] = mock_websocket_server;
    })

    afterAll(() => {
        // close the server after all the tests are done.
        server['http_server'].close();
    })

    it('should_handle_GET_request', () => {
        const mock_request = {
            method: 'GET',
            url: 'http://example.com'
        } as http.IncomingMessage;

        const mock_response = {

        } as http.ServerResponse;
        
        // const mock_response = {
        //     setHeader: jest.fn(),
        //     end: jest.fn()
        // } as http.ServerResponse<http.IncomingMessage>;

        const typed_mock_res = mock_response as http.ServerResponse<http.IncomingMessage>;

        // expect(mock_logger.info).toHaveBeenCalled({}, 'http_server_started');
    })
});