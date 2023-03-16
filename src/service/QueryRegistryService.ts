export interface QueryRegistry {
    executingQueries: Query;
    executedQueries: any[];
    futureQueries: any[];
}

type Query = {
    [key: string]: {
        timestamp: number; query: string;

    }
}

// TODO check if there is away in which you can map the query with a timestamp and then get it back when you query it from there.
