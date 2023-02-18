## Solid Stream Aggregator

Solid Stream Aggregator provides aggregation of stream data over a solid pod and stores the aggregation event in a common aggregation solid pod.
It is built with [RSP-JS](https://github.com/pbonte/RSP-JS) and [VersionAwareLDESinLDP](https://github.com/woutslabbinck/VersionAwareLDESinLDP). The aggregator uses the [CSS](https://github.com/CommunitySolidServer/CommunitySolidServer) for the solid pods.

## About
The aggregator is exposed as a service on a HTTP server. Queries are sent to the aggregator via HTTP GET Requests on predefined endpoints. 
The aggregator executes then aggregates the data as specified in the query and uploads the aggregation data to the Solid Pod.

## Usage
```
- npm install
- npm run start aggregation
```
You can specify the last X minutes of data you wish to aggregate on. The default is 30 minutes.

Note : The aggregator is in active development and will be continuously updated.
