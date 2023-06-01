import { AggregationFocusExtractor } from "./AggregationFocusExtractor";

describe('extracting_the_focus_of_an_query_which_is_being_aggregated', () => {
    it('should_return_one_focus_of_the_query_one_window', () => {
        let single_focus_query: string = `
PREFIX saref: <https://saref.etsi.org/core/> 
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
PREFIX : <https://rsp.js/>
REGISTER RStream <output> AS
SELECT (AVG(?o) AS ?averageHR1)
FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 5]
WHERE{
    WINDOW :w1 { ?s saref:hasValue ?o .
                 ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
}`

        let focus_of_query = {
            "focus_1": "https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/wearable.bvp",
        }
        let aggregation_focus_extractor = new AggregationFocusExtractor(single_focus_query);
        expect(aggregation_focus_extractor.extract_focus()).toEqual(focus_of_query);
    });

    it('should_return_two_focus_of_the_query_two_windows', () => {
        let multiple_focus_query: string = `
PREFIX saref: <https://saref.etsi.org/core/>
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
PREFIX : <https://rsp.js/> 
PREFIX rdfs: <https://www.w3.org/2000/01/rdf-schema#> 
REGISTER RStream <output> AS
SELECT (AVG(?o) AS ?averageHR2)
FROM NAMED WINDOW :w1 ON STREAM <http://localhost:3000/dataset_participant1/data/> [RANGE 10 STEP 2]
FROM NAMED WINDOW :w2 ON STREAM <http://localhost:3000/dataset_participant2/data/> [RANGE 10 STEP 5]

WHERE{
    WINDOW :w1 { ?s saref:hasValue ?o .
                    ?s saref:relatesToProperty dahccsensors:wearable.bvp .}
    WINDOW :w2 { ?s saref:hasValue ?o .
                    ?s <https://www.w3.org/2000/01/rdf-schema#range> dahccsensors:smartphone .}
                    
}`;
    let focus_of_query = {
        "focus_1": "https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/wearable.bvp",
        "focus_2": "https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/smartphone",
    };

    let aggregation_focus_extractor = new AggregationFocusExtractor(multiple_focus_query);
    expect(aggregation_focus_extractor.extract_focus()).toEqual(focus_of_query);
    });
})