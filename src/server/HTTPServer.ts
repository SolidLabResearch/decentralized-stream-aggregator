import { AggregatorInstantiator } from "../service/AggregatorInstantiator";
import { AggregationLDESPublisher } from "../service/AggregationLDESPublisher";
const http = require('http');
const express = require('express');
const cors = require('cors');
const websocket = require('websocket');
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();
const {Parser} = require('n3');

export class HTTPServer {
    private minutes: number;
    private serverURL: string;
    private aggregationResourceList: any[] = [];
    private resourceListBatchSize: number = 500;
    constructor(port: number, minutes: number, serverURL: string) {
        this.minutes = minutes;
        this.serverURL = serverURL;
        const app = express();
        let publisher = new AggregationLDESPublisher();
        app.server = http.createServer(app);
        app.use(cors({
            exposedHeaders: '*',
        }));

        const wss = new websocket.server({
            httpServer: app.server,
        });

        app.server.listen(port, () => {
            console.log(`Server started on port http://localhost:${app.server.address().port}`);
        });

        app.get('/', (req: any, res: any) => {
            res.send('Hello World!');
        });

        app.get('/test', (req: any, res: any) => {
            let query = `
            PREFIX : <https://rsp.js/> PREFIX saref: <https://saref.etsi.org/core/> PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
         REGISTER RStream <output> AS
         SELECT (AVG(?o) AS ?averageAcceleration)
         FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
         WHERE{
             WINDOW :w1 { ?s saref:hasValue ?o .
                    } 
                }
            `
            console.log(`Received request on /test`);
            new AggregatorInstantiator(query, this.minutes, this.serverURL);
        });

        app.get('/averageHRPatient1', (req: any, res: any) => {
            let query = `  
            PREFIX saref: <https://saref.etsi.org/core/> 
            PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
            PREFIX : <https://rsp.js/>
            REGISTER RStream <output> AS
            SELECT (AVG(?o) AS ?averageHR1)
            FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
            WHERE{
                WINDOW :w1 { ?s saref:hasValue ?o .
                             ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
            }
            `
            res.send('Received request on /averageHRPatient1');
            new AggregatorInstantiator(query, minutes, 'http://localhost:3000/');
        });

        wss.on('request', async (request: any) => {
            let connection = request.accept('echo-protocol', request.origin);
            console.log('Connection accepted');
            connection.on('message', async (message: any) => {
                if (message.type === 'utf8') {
                    let value = message.utf8Data;
                    eventEmitter.emit('aggregationEvent', value);
                    // console.log(`Received Message: ${message.utf8Data}`); // log the message that we've received for testing.
                }
            });

            connection.on('close', function (reasonCode: any, description: any) {
                console.log('Peer ' + connection.remoteAddress + ' disconnected.');
            });

            eventEmitter.on('aggregationEvent', (value: any) => {
                const parser = new Parser({'format': 'N-Triples'});
                const store = parser.parse(value);
            
                this.aggregationResourceList.push(store);
                if (this.aggregationResourceList.length == this.resourceListBatchSize) {
                    if (publisher.initialised == false) {
                        publisher.initialise();
                        publisher.initialised = true;
                    }
                    console.log();
                    
                    publisher.publish(this.aggregationResourceList);
                    this.aggregationResourceList = [];
                }
                if (this.aggregationResourceList.length < this.resourceListBatchSize) {
                    if (publisher.initialised == false) {
                        publisher.initialise();
                        publisher.initialised = true;
                    }
                    publisher.publish(this.aggregationResourceList);
                    this.aggregationResourceList = [];
                }
            });
            eventEmitter.on('close', () => {
                console.log('Closing connection');
            });

        });
    }

}