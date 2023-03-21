import { AggregatorInstantiator } from "../service/AggregatorInstantiator";
import { AggregationLDESPublisher } from "../service/AggregationLDESPublisher";
import { SPARQLToRSPQL } from "../service/SPARQLToRSPQL";
import { QueryRegistry } from "../service/QueryRegistry";
import { Logger, ILogObj } from "tslog";
const http = require('http');
const express = require('express');
const cors = require('cors');
const websocket = require('websocket');
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();
const { Parser } = require('n3');

export class HTTPServer {
    private readonly minutes: number;
    private readonly serverURL: string;
    private aggregationResourceList: any[] = [];
    private resourceListBatchSize: number = 500;
    public logger: Logger<ILogObj>;
    constructor(port: number, minutes: number, serverURL: string) {
        this.minutes = minutes;
        this.serverURL = serverURL;
        const app = express();
        this.logger = new Logger();
        let publisher = new AggregationLDESPublisher();
        let queryRegistry = new QueryRegistry();
        let sparqlToRSPQL = new SPARQLToRSPQL();
        app.server = http.createServer(app);
        app.use(cors({
            exposedHeaders: '*',
        }));
        app.use(express.static('public'));
        app.use(express.urlencoded());
        /*
        TODO: work on adding the parameter to the express route
        app.use(require('./Routes'));
        */
        const wss = new websocket.server({
            httpServer: app.server,
        });

        app.server.listen(port, () => {
            console.log(`Server started on port http://localhost:${app.server.address().port}`);
        });

        app.get('/test', (req: any, res: any) => {
            let query_one = `  
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

            let query_two = `  
            PREFIX saref: <https://saref.etsi.org/core/> 
            PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
            PREFIX : <https://rsp.js/>
            REGISTER RStream <output> AS
            SELECT (AVG(?object) AS ?averageHR1)
            FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
            WHERE{
                WINDOW :w1 { ?subject saref:hasValue ?object .
                             ?subject saref:relatesToProperty dahccsensors:wearable.bvp .}
            }
            `
            if (queryRegistry.registerQuery(query_one)) {
                queryRegistry.add(query_one);
            }
            if (queryRegistry.registerQuery(query_two)) {
                queryRegistry.add(query_two);
            }
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

        app.get('/queryRegistryIsomorphicTest', (req: any, res: any) => {
            let simple_query_one = `PREFIX : <https://rsp.js/>
            REGISTER RStream <output> AS
            SELECT (AVG(?v) as ?avgTemp)
            FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
            WHERE{
                WINDOW :w1 { ?sensor :value ?v ; :measurement: ?m }
            }`;
            let simple_query_two = `PREFIX : <https://rsp.js/>
            REGISTER RStream <output> AS
            SELECT (AVG(?v) as ?avgTemp)
            FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
            WHERE{
                WINDOW :w1 { ?sensor :value ?v ; :measurement: ?m }
            }`;
            let simple_query_three = `PREFIX : <https://rsp.js/>
            REGISTER RStream <output> AS
            SELECT (AVG(?v) as ?avgTemp)
            FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
            WHERE{
                WINDOW :w1 { ?sensor :valueX ?v ; :measurement: ?m }
            }`;
            let simple_query_four = `PREFIX : <https://rsp.js/>
            REGISTER RStream <output> AS
            SELECT (AVG(?v) as ?average)
            FROM NAMED WINDOW :w1 ON STREAM :stream3 [RANGE 10 STEP 2]
            WHERE {
                WINDOW :w1 {?something :random ?v}
            }
            `;
            queryRegistry.add(simple_query_one);
            queryRegistry.add(simple_query_two);
            queryRegistry.add(simple_query_three);
            queryRegistry.add(simple_query_four);

            res.send(`Received request on /queryRegistryIsomorphicTest`)
        });

        app.get('/queryRegistryTest', (req: any, res: any) => {
            let queryOne = `
            PREFIX saref: <https://saref.etsi.org/core/>
            PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
            PREFIX : <https://rsp.js/>
            SELECT (AVG(?o) AS ?averageHR1)
            WHERE{
                ?s saref:hasValue ?o .
                ?s saref:relatesToProperty dahccsensors:wearable.bvp .
            }
            `;
            let queryTwo = `    
            PREFIX saref: <https://saref.etsi.org/core/>
            PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
            PREFIX : <https://rsp.js/>
            SELECT ?object
            WHERE{
                ?subject saref:hasValue ?object .
                ?subject saref:relatesToProperty dahccsensors:wearable.bvp .
            }
            `

            let queryThree = `
            PREFIX saref: <https://saref.etsi.org/core/>
            PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
            PREFIX : <https://rsp.js/>
            SELECT ?object
            WHERE{
                ?subject saref:hasValue ?object .
                ?subject saref:relatesToProperty dahccsensors:wearable.bvp .
            }`;
            // console.log(`for queryOne: ${sparqlToRSPQL.getRSPQLQuery(queryOne)} and for queryTwo: ${sparqlToRSPQL.getRSPQLQuery(queryTwo)}`);
            queryRegistry.add(queryTwo);
            queryRegistry.add(queryThree);
            queryRegistry.add(queryTwo);
        });

        // TODO : work on the SPARQL to RSPQL conversion.

        /*
        To be used as, /sparql?value=SELECT * WHERE { ?s ?p ?o }
        */
        app.get('/sparql', (req: any, res: any) => {
            let query: string = req.query.value;
            let aggregationFunction: string = (req.query.aggregationFunction.toUpperCase());
            console.log(aggregationFunction);
            let value = sparqlToRSPQL.getRSPQLQuery(query);
            console.log(`The RSP-QL Query is: ${value}`);
        });

        wss.on('request', async (request: any) => {
            let connection = request.accept('echo-protocol', request.origin);
            console.log('Connection accepted');
            connection.on('message', async (message: any) => {
                if (message.type === 'utf8') {
                    let value = message.utf8Data;
                    eventEmitter.emit('AggregationEvent$', value);
                }
            });

            connection.on('close', function (reasonCode: any, description: any) {
                console.log('Peer ' + connection.remoteAddress + ' disconnected.');
            });

            eventEmitter.on('AggregationEvent$', (value: any) => {
                const parser = new Parser({ 'format': 'N-Triples' });
                const store = parser.parse(value);
                this.aggregationResourceList.push(store);
                if (this.aggregationResourceList.length == this.resourceListBatchSize) {
                    if (!publisher.initialised) {
                        publisher.initialise();
                        publisher.initialised = true;
                    }
                    publisher.publish(this.aggregationResourceList);
                    this.aggregationResourceList = [];
                }
                if (this.aggregationResourceList.length < this.resourceListBatchSize) {
                    if (!publisher.initialised) {
                        publisher.initialise();
                        publisher.initialised = true;
                    }
                    publisher.publish(this.aggregationResourceList);
                    this.aggregationResourceList = [];
                }
                if (this.aggregationResourceList.length === 0) {
                    console.log('No data to publish');
                }
            });
            eventEmitter.on('close', () => {
                console.log('Closing connection');
            });

        });
    }
}
