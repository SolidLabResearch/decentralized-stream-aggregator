# Solid Stream Aggregator

`The aggregator is in active continuous development and will be changed frequently.`

The Solid Stream Aggregator provides an aggregated view over streaming data stored in single or multiple solid pods.
The Solid Stream Aggregator aggregates and stores the view in a solid pod and therefore reduces the overhead of querying multiple solid pods to build the specific view. 
The aggregated view is beneficial for applications such as for continuous monitoring.

## Usage

### Prerequisites

- Solid Pod(s) with streaming data stored with [LDES in LDP](https://woutslabbinck.github.io/LDESinLDP/) specification.

### Installation

```
- npm install
```

To start the aggregator, run the following command:

```
- npm run start aggregation
```

## License

This code is copyrighted by [Ghent University - imec](https://www.ugent.be/ea/idlab/en) and released under the [MIT Licence](./LICENCE)

## Contact

For any questions, please contact [Kush](mailto:kushagrasingh.bisen@ugent.be).
