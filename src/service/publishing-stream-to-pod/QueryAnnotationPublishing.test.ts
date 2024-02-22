import { patchSparqlUpdateDelete } from "./QueryAnnotationPublishing";
const N3 = require('n3');

describe('query_annotation_publishing', () => {

    it('publish_with_fno_annotation', () => {

    });

    it('return_sparl_delete', () => {
        const store = new N3.Store();
        store.addQuad('http://example.com/s1', 'http://example.com/p1', 'http://example.com/o1');
        const delete_query = patchSparqlUpdateDelete(store);        
        const string = 'DELETE DATA {<http://example.com/s1> <http://example.com/p1> <http://example.com/o1> .\n}';
        expect(delete_query).toBe(string);
    }); 
});