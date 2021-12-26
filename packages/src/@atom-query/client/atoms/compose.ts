import { QueriesResult, Query } from '../models';

export function compose<
  Params extends {},
  R extends { [key: string]: Query<any, any> },
>(fn: (params: Params) => R) {
  return new QueryComposer<Params, QueriesResult<R>>(fn);
}

type MapOperator<T, R> = (x: T) => R | Promise<R>;

export type ComposedQueryResult<R> = {
  queries: { [key: string]: Query<any, any> };
  map?: (queryResult: any) => Promise<R>;
};

export class QueryComposer<Params extends {}, R> {
  private fns: MapOperator<any, any>[] = [];

  constructor(
    private readonly fn: (params: Params) => { [key: string]: Query<any, any> },
  ) {}

  map = <R2>(fn: MapOperator<R, R2>): QueryComposer<Params, R2> => {
    const next = new QueryComposer<Params, R2>(this.fn);
    next.fns = [...this.fns, fn];
    return next;
  };

  create =
    () =>
    (params: Params): ComposedQueryResult<R> => {
      const queries: { [key: string]: Query<any[], any> } = this.fn(params);

      if (this.fns.length === 0) {
        return { queries };
      }

      return {
        queries,
        map: async (queryResult: any): Promise<R> => {
          let currentValue = queryResult;

          for (const fn of this.fns) {
            currentValue = await fn(currentValue);
          }

          return currentValue as R;
        },
      };
    };
}
