export type ElasticSearchQueryResult<T> = {
  data: {
    hits: {
      hits: {
        _index: string;
        _type: string;
        _id: string;
        score: number;
        _ignored: string[];
        _source: T;
      }[];
    };
  };
};
