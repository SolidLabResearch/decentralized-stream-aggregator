import * as websocket from 'websocket';
import { LDESPublisher } from '../service/publishing-stream-to-pod/LDESPublisher';
import { hash_string_md5 } from '../utils/Util';
import { WebSocketHandler } from './WebSocketHandler';
import * as bunyan from 'bunyan';

const logger = bunyan.createLogger({
   name: 'solid-stream-aggregator',
   streams: [
      {
         level: 'info',
         stream: process.stdout
      },
   ],
   serializers: {
      log: (log_data: any) => {
         return {
            ...log_data,
            query_id: log_data.query_id || 'no_query_id',
         }
      }
   }
});
const EventEmitter = require('events');
const event_emitter = new EventEmitter();

describe('WebSocketHandler', () => {
   let websocket_server: websocket.server;
   let aggregation_publisher: LDESPublisher = new LDESPublisher();
   let websocket_handler: WebSocketHandler;
   let http_server: any;
   beforeEach(() => {
      http_server = require('http').createServer().listen(8080);
      websocket_server = new websocket.server({ httpServer: http_server });
      websocket_handler = new WebSocketHandler(websocket_server, event_emitter, aggregation_publisher, logger);
   });
   afterEach(() => {
   });

   it('it_should_start_the_websocket_server', async () => {
      expect(websocket_server).toBeDefined();
   });

   it('associate_a_websocket_channel_to_query', async () => {
      const query = `PREFIX saref: <https://saref.etsi.org/core/>
      PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
      PREFIX : <https://rsp.js/>
      REGISTER RStream <output> AS
      SELECT (AVG(?o) AS ?averageHR2)
      FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant2/data/> [RANGE 1800 STEP 20]
      WHERE{
          WINDOW :w1 { ?s saref:hasValue ?o .
                          ?s saref:relatesToProperty dahccsensors:wearable.bvp .}}`;
      const hashed_query = hash_string_md5(query);
      websocket_handler.set_connections(hashed_query, new WebSocket('ws://localhost:8080/'));
      console.log(websocket_handler.get_connections());
   });
});