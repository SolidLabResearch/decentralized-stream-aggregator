## Solid Stream Aggregator

To run the project you will have to, in order:

1. ```npm install```
2. ```npm run build```
3. ```npm run start aggregate```

This will run a server on port 8080, and has two API endpoints at the moment for testing.
'/test' and '/averageHRPatient1'

The aggregation events from the pod(s) are currently logged into the console, which can be connected or sent 
to other service.