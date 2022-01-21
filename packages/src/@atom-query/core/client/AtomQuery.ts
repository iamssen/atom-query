import { Composer, QueryComposer } from '../atoms/compose';
import { createFID, FetchRunner } from '../fetch/FetchRunner';
import { Query, QueryOrValue, ResolvedResult, Result } from '../types';
import { fetchQuery } from './fetchQuery';

export class AtomQuery {
  private readonly runner: FetchRunner;

  constructor() {
    this.runner = new FetchRunner();
  }

  fetchCount = (query: Query<any, any>): number => {
    return this.runner.fetchCount.get(createFID(query)) ?? 0;
  };

  fetch = async <T extends Record<string, Query<any, any>>>(
    obj: T,
  ): Promise<{
    readonly [K in keyof T]: T[K] extends Query<any, infer R>
      ? Result<R>
      : never;
  }> => {
    return fetchQuery(obj, this.runner);
  };

  createFetch = <
    T extends
      | Composer<any, any>
      | ((...args: any[]) => Record<string, QueryOrValue<any>>),
  >(
    source: T,
  ): T extends Composer<infer Args, infer R>
    ? (...args: Args) => Promise<ResolvedResult<R>>
    : T extends (...args: infer Args) => infer R
    ? (...args: Args) => Promise<ResolvedResult<R>>
    : never => {
    const composer: Composer<any, any> =
      typeof source === 'function' ? new QueryComposer([source]) : source;

    return (async (...a: any[]) => {
      const {
        args,
        fetches: [firstFetch, ...restFetches],
        mappers,
      } = composer.build(...a);

      let values: any = await fetchQuery(firstFetch(...args), this.runner);

      for (const fetch of restFetches) {
        values = await fetchQuery(fetch(values), this.runner);
      }

      if (!mappers || mappers.length === 0) {
        return values;
      }

      let value: any = values;

      for (const map of mappers) {
        value = await map(value);
      }

      return value;
    }) as any;
  };
}
