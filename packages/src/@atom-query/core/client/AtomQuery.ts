import { Composer, isComposer, QueryComposer } from '../atoms/compose';
import { createFID, FetchRunner } from '../fetch/FetchRunner';
import { Query, QueryOrValue, QueryResult } from '../types';
import { fetchQuery } from './fetchQuery';

interface AtomQueryFetch {
  /**
   * fetch data using Query objects
   *
   * @example
   * ```
   * await { x, y } = await atom.fetch({
   *    x: foo({ a: 10 }),
   *    y: bar({ b: 20 }),
   * })
   * ```
   */
  <R extends Record<string, QueryOrValue<any>>>(obj: R): Promise<
    QueryResult<R>
  >;

  /**
   * fetch data using Composer object
   *
   * @example
   * ```
   * const com = compose((id: number, currency: string) => {
   *   return {
   *     balance: balance(id),
   *     exchangeRate: exchangeRate(currency),
   *   }
   * }).map(({ balance, exchangeRate }) => {
   *   return balance.success && exchangeRate.success
   *     ? balance.value * exchangeRate.value
   *     : 0
   * })
   *
   * const value = await atom.fetch(com, 15, 'krw')
   * ```
   */
  <Args extends unknown[], R>(
    composer: Composer<Args, R>,
    ...args: Args
  ): Promise<QueryResult<R>>;
}

interface AtomQueryCreateFetch {
  /**
   * create fetch function
   *
   * @example
   * ```
   * const fn = atom.createFetch((a: number, b: number) => {
   *   return {
   *     x: foo({ a }),
   *     y: bar({ b }),
   *   }
   * })
   *
   * await { x, y } = await fn()
   * ```
   */
  <T extends (...args: any[]) => Record<string, QueryOrValue<any>>>(
    source: T,
  ): T extends (...args: infer Args) => infer R
    ? (...args: Args) => Promise<QueryResult<R>>
    : never;

  /**
   * create fetch function using Composer object
   *
   * @example
   * ```
   * const com = compose((id: number, currency: string) => {
   *   return {
   *     balance: balance(id),
   *     exchangeRate: exchangeRate(currency),
   *   }
   * }).map(({ balance, exchangeRate }) => {
   *   return balance.success && exchangeRate.success
   *     ? balance.value * exchangeRate.value
   *     : 0
   * })
   *
   * const fn = atom.createFetch(com)
   *
   * const value = await fn(15, 'krw')
   * ```
   */
  <T extends Composer<any, any>>(source: T): T extends Composer<
    infer Args,
    infer R
  >
    ? (...args: Args) => Promise<QueryResult<R>>
    : never;
}

export class AtomQuery {
  private readonly runner: FetchRunner;

  constructor() {
    this.runner = new FetchRunner();
  }

  fetchCount = (query: Query<any, any>): number => {
    return this.runner.fetchCount.get(createFID(query)) ?? 0;
  };

  fetch: AtomQueryFetch = (first: any, ...args: any[]) => {
    if (isComposer(first)) {
      return this.createFetch(first)(...args);
    } else {
      return fetchQuery(first, this.runner);
    }
  };

  createFetch: AtomQueryCreateFetch = (source: any) => {
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
