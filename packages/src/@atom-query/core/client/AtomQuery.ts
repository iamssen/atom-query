import {
  compose,
  Composer,
  MapComposer,
  QueryComposer,
} from '../atoms/compose';
import { createFID, FetchRunner } from '../fetch/FetchRunner';
import { Query, QueryOrValue, QueryResult } from '../types';
import { fetchQuery } from './fetchQuery';

type AtomQueryFetchFunction<Args extends unknown[], R> = (
  ...args: Args
) => Promise<R>;

export class AtomQuery {
  readonly #runner: FetchRunner;
  readonly #cachedFetches = new Map<
    Composer<any, any>,
    AtomQueryFetchFunction<any, any>
  >();

  constructor() {
    this.#runner = new FetchRunner();
  }

  fetchCount = (query: Query<any, any>): number => {
    return this.#runner.fetchCount.get(createFID(query)) ?? 0;
  };

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
  fetch = <T extends Record<string, QueryOrValue<any>>>(
    obj: T,
  ): Promise<QueryResult<T>> => {
    return fetchQuery(obj, this.#runner);
  };

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
  fetchCompose = <C extends Composer<any, any>>(
    composer: C,
    ...args: C extends Composer<infer Args, any> ? Args : []
  ): Promise<
    C extends QueryComposer<any, infer R>
      ? QueryResult<R>
      : C extends MapComposer<any, infer R>
      ? R
      : never
  > => {
    const fetchFn = this.createFetch(composer) as AtomQueryFetchFunction<
      any,
      any
    >;
    return fetchFn(...(args as any));
  };

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
  createFetch = <C extends Composer<any, any>>(
    composer: C,
    instant: boolean = false,
  ): C extends QueryComposer<infer Args, infer R>
    ? AtomQueryFetchFunction<Args, QueryResult<R>>
    : C extends MapComposer<infer Args, infer R>
    ? AtomQueryFetchFunction<Args, R>
    : never => {
    if (!instant && this.#cachedFetches.has(composer)) {
      return this.#cachedFetches.get(composer) as any;
    }

    const fetchFn: AtomQueryFetchFunction<any, any> = async (...a: any[]) => {
      const {
        args,
        fetches: [firstFetch, ...restFetches],
        mappers,
      } = composer.build(...a);

      let values: any = await fetchQuery(firstFetch(...args), this.#runner);

      for (const fetch of restFetches) {
        values = await fetchQuery(fetch(values), this.#runner);
      }

      if (!mappers || mappers.length === 0) {
        return values;
      }

      let value: any = values;

      for (const map of mappers) {
        value = await map(value);
      }

      return value;
    };

    if (!instant) {
      this.#cachedFetches.set(composer, fetchFn);
    }

    return fetchFn as any;
  };

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
  createInstantFetch = <
    Args extends unknown[],
    R extends Record<string, QueryOrValue<any>>,
  >(
    fetch: (...args: Args) => R,
  ): AtomQueryFetchFunction<Args, QueryResult<R>> => {
    const composer: QueryComposer<Args, R> = compose(fetch);
    return this.createFetch(composer, true);
  };
}
