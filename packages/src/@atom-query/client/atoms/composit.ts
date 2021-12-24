import { Query, Result } from '../models';

export function composit<
  Params extends {},
  R extends { [key: string]: Query<any, any> },
>(fn: (params: Params) => R) {
  return new Compositor<
    Params,
    {
      readonly [K in keyof R]: R[K] extends Query<any[], infer V>
        ? Result<V>
        : never;
    }
  >(fn);
}

type MapFunction<T, R> = (x: T) => R | Promise<R>;
export type CompositedQueryResult<R> = {
  queries: { [key: string]: Query<any, any> };
  map?: (queryResult: any) => Promise<R>;
};

export class Compositor<Params extends {}, R> {
  private fns: MapFunction<any, any>[] = [];

  constructor(
    private readonly fn: (params: Params) => { [key: string]: Query<any, any> },
  ) {}

  map = <R2>(fn: MapFunction<R, R2>): Compositor<Params, R2> => {
    const next = new Compositor<Params, R2>(this.fn);
    next.fns = [...this.fns, fn];
    return next;
  };

  create =
    () =>
    (params: Params): CompositedQueryResult<R> => {
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
