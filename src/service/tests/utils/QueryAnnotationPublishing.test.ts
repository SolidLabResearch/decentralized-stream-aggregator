import { QueryAnnotationPublishing } from "../../../utils/algorithms/QueryAnnotationPublishing";


let dahcc_query = `
PREFIX saref: <https://saref.etsi.org/core/> 
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
PREFIX : <https://rsp.js/>
REGISTER RStream <output> AS
SELECT (AVG(?object) AS ?averageHR1)
FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant2/data/> [RANGE 10 STEP 2]
WHERE{
    WINDOW :w1 { ?subject saref:hasValue ?object .
                 ?subject saref:relatesToProperty dahccsensors:wearable.bvp .}
}
`;
describe("query_annotation_publishing_test", () => {
    it("test_get_query_metadata", () => {
        let publisher = new QueryAnnotationPublishing();
        let query_metadata_store = publisher.get_query_metadata(dahcc_query);
        console.log(query_metadata_store.getQuads()); 
    });
});