import { POSTHandler } from './POSTHandler';
import { IncomingMessage, ServerResponse } from 'http';
import { QueryRegistry } from '../service/query-registry/QueryRegistry';
describe('POSTHandler', () => {
  describe('handle', () => {
    it('should handle rspql query', async () => {
      // Mock dependencies and setup test data
      const req = {} as IncomingMessage;
      const res = {} as ServerResponse;
      const query_registry = {} as QueryRegistry;
      const solid_server_url = 'http://example.com';
      const logger = console;

      const body = {
        query: 'SELECT * WHERE { ?s ?p ?o }',
        latest_minutes: 10,
        query_type: 'rspql',
      };
      const post_body = JSON.stringify(body);

      // Mock request events
      req.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from(post_body));
        } else if (event === 'end') {
          callback();
        }
      });

      // Call the handle method
      await POSTHandler.handle(req, res, query_registry, solid_server_url, logger);

      // Assert the expected behavior
      // Add your assertions here
    });

    it('should handle sparql query', async () => {
      // Mock dependencies and setup test data
      const req = {} as IncomingMessage;
      const res = {} as ServerResponse;
      const query_registry = {} as QueryRegistry;
      const solid_server_url = 'http://example.com';
      const logger = console;

      const body = {
        query: 'SELECT * WHERE { ?s ?p ?o }',
        latest_minutes: 10,
        query_type: 'sparql',
      };
      const post_body = JSON.stringify(body);

      // Mock request events
      req.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from(post_body));
        } else if (event === 'end') {
          callback();
        }
      });

      // Call the handle method
      await POSTHandler.handle(req, res, query_registry, solid_server_url, logger);

      // Assert the expected behavior
      // Add your assertions here
    });

    it('should handle other query types', async () => {
      // Mock dependencies and setup test data
      const req = {} as IncomingMessage;
      const res = {} as ServerResponse;
      const query_registry = {} as QueryRegistry;
      const solid_server_url = 'http://example.com';
      const logger = console;

      const body = {
        query: 'SELECT * WHERE { ?s ?p ?o }',
        latest_minutes: 10,
        query_type: 'other',
      };
      const post_body = JSON.stringify(body);

      // Mock request events
      req.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from(post_body));
        } else if (event === 'end') {
          callback();
        }
      });

      // Call the handle method
      await POSTHandler.handle(req, res, query_registry, solid_server_url, logger);

      // Assert the expected behavior
      // Add your assertions here
    });
  });

  describe('handle_ws_query', () => {
    it('should handle ws query', async () => {
      // Mock dependencies and setup test data
      const query = 'SELECT * WHERE { ?s ?p ?o }';
      const width = 10;
      const query_registry = {} as QueryRegistry;
      const logger = console;
      const websocket_connections = new Map();

      // Call the handle_ws_query method
      await POSTHandler.handle_ws_query(query, width, query_registry, logger, websocket_connections);

      // Assert the expected behavior
      // Add your assertions here
    });
  });

  describe('connect_with_server', () => {
    it('should connect with server', async () => {
      // Mock dependencies and setup test data
      const wssURL = 'ws://example.com';

      // Call the connect_with_server method
      await POSTHandler.connect_with_server(wssURL);

      // Assert the expected behavior
      // Add your assertions here
    });
  });

  describe('sendToServer', () => {
    it('should send message to server if connection is established', () => {
      // Mock dependencies and setup test data
      const message = 'Hello, server!';
      const connection = {
        connected: true,
        sendUTF: jest.fn(),
      };

      // Set the connection
      POSTHandler.connection = connection;

      // Call the sendToServer method
      POSTHandler.sendToServer(message);

      // Assert the expected behavior
      expect(connection.sendUTF).toHaveBeenCalledWith(message);
    });

    it('should establish connection with server and send message if connection is not established', async () => {
      // Mock dependencies and setup test data
      const message = 'Hello, server!';
      const connection = {
        connected: false,
        sendUTF: jest.fn(),
      };

      // Set the connection
      POSTHandler.connection = connection;

      // Mock the connect_with_server method
      POSTHandler.connect_with_server = jest.fn().mockResolvedValue(undefined);

      // Call the sendToServer method
      POSTHandler.sendToServer(message);

      // Assert the expected behavior
      expect(POSTHandler.connect_with_server).toHaveBeenCalledWith('ws://localhost:8080/');
      expect(connection.sendUTF).toHaveBeenCalledWith(message);
    });
  });
});