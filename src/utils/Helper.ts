export class Helper{

    constructor(){
        console.log("Helper class instantiated");
        
    }
    public ComunicaTimestampExtractorQuery: string = "SELECT ?time WHERE {" +
    "?s ?p ?o ." +
    "?s <https://saref.etsi.org/core/hasTimestamp> ?time" +
    "}";

    async epoch(date: any) {
        return Date.parse(date);
    }
}