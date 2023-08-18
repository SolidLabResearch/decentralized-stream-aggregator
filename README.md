# Solid Stream Aggregator

The Solid Stream Aggregator is a service that can be used on top of a Solid Pod or multiple Solid Pods to construct a materialized view on top of the sensor measurements stored in the Solid Pod. The Solid Pod should use the [LDES in LDP](https://woutslabbinck.github.io/LDESinLDP/) specification to store the sensor measurements. The aggregated results are published to the aggregator's Solid Pod which can be used by other processes, such as a dashboard, to visualize the aggregated results.

## License

This code is copyrighted by [Ghent University - imec](https://www.ugent.be/ea/idlab/en) and released under the [MIT Licence](./LICENCE)

## Contact

For any questions, please contact [Kush](mailto:kushagrasingh.bisen@ugent.be).
