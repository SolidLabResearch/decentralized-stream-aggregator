export interface QueryRegistry {
    executingQueries: any[];
    executedQueries: any[];
    failedQueries: any[];
    futureQueries: any[];
}

// TODO check if there is away in which you can map the query with a timestamp and then get it back when you query it from there.


