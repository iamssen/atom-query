import { Composer, isComposer, QueryComposer } from '../atoms/compose';
import { createFID, FetchRunner } from '../fetch/FetchRunner';
import { Query, QueryOrValue, ResolvedResult } from '../types';
import { fetchQuery } from './fetchQuery';

interface AtomQueryFetch {
  <R extends Record<string, QueryOrValue<any>>>(obj: R): Promise<
    ResolvedResult<R>
  >;
  <Args extends unknown[], R>(
    composer: Composer<Args, R>,
    ...rest: [...Args, FetchRunner?]
  ): Promise<ResolvedResult<R>>;
}

export class AtomQuery {
  private readonly runner: FetchRunner;

  constructor() {
    this.runner = new FetchRunner();
  }

  fetchCount = (query: Query<any, any>): number => {
    return this.runner.fetchCount.get(createFID(query)) ?? 0;
  };

  fetch: AtomQueryFetch = (first: any, ...rest: any[]) => {
    if (isComposer(first)) {
      const args =
        rest[rest.length - 1] instanceof FetchRunner
          ? rest.slice(0, rest.length - 1)
          : rest;
      return this.createFetch(first)(...args);
    } else {
      return fetchQuery(first, this.runner);
    }
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
