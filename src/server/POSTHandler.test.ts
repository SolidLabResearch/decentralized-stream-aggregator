import { QueryHandler } from './QueryHandler';
import { QueryRegistry } from '../service/query-registry/QueryRegistry';
describe('QueryHandler', () => {
  describe('handle', () => {
    
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
      await QueryHandler.handle_ws_query(query, width, query_registry, logger, websocket_connections, 'rspql', {});

      // Assert the expected behavior
      // Add your assertions here
    });
  });

  describe('connect_with_server', () => {
    it('should connect with server', async () => {
      // Mock dependencies and setup test data
      const wssURL = 'ws://example.com';

      // Call the connect_with_server method
      await QueryHandler.connect_with_server(wssURL);

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
      QueryHandler.connection = connection;

      // Call the sendToServer method
      QueryHandler.sendToServer(message);

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
      QueryHandler.connection = connection;

      // Mock the connect_with_server method
      QueryHandler.connect_with_server = jest.fn().mockResolvedValue(undefined);

      // Call the sendToServer method
      QueryHandler.sendToServer(message);

      // Assert the expected behavior
      expect(QueryHandler.connect_with_server).toHaveBeenCalledWith('ws://localhost:8080/');
      expect(connection.sendUTF).toHaveBeenCalledWith(message);
    });
  });
});