import { v4 as uuid } from 'uuid';
import { PrimitiveParams, Query, QueryFunction } from '../types';

// ---------------------------------------------
// query()
// ---------------------------------------------
export interface QueryOptions<T extends PrimitiveParams> {
  cacheTime?: number;
  id?: (params: T) => string;
}

export function createQueryId(params: PrimitiveParams): string {
  const keys = Object.keys(params).sort();
  return keys.map((key) => `${key}=${params[key]}`).join('::');
}

/**
 * Make a query unit
 *
 * @param fetch unary function
 * @param cacheTime time to store the results of query
 * @param id creates unique id of query
 *
 * @example
 * ```
 * const api = query((p: {id: number}) => {
 *   return fetch(`http://api/${p.id}`).then(res => res.json())
 * })
 *
 * const atom = new AtomQuery()
 * const { value } = await atom.fetchQuery({ value: api({id: 10}) })
 * ```
 */
export function query<T extends PrimitiveParams, R>(
  fetch: (params: T) => Promise<R>,
  { cacheTime = 1000, id = createQueryId }: QueryOptions<T> = {},
): QueryFunction<[T], R> {
  const key = uuid();

  const queryFunction = (params: T): Query<[T], R> => {
    return {
      key,
      args: [params],
      id: id(params),
      cacheTime,
      fetch,
    };
  };

  queryFunction.key = key;
  queryFunction.cacheTime = cacheTime;

  return queryFunction;
}

// ---------------------------------------------
// query.expand()
// ---------------------------------------------
export interface ExpandedQueryOptions<Args extends unknown[]> {
  cacheTime?: number;
  id: (...args: Args) => string;
}

/**
 * The parameter of query() is limited to a primary value.
 * (The reason is to prevent problems with the creation of unique id)
 *
 * If you want to use an object type other than a primitive value as a parameter,
 * you can use this. Instead, you must enter id function.
 */
function expandedQuery<Args extends unknown[], R>(
  fetch: (...args: Args) => Promise<R>,
  { cacheTime = 1000, id }: ExpandedQueryOptions<Args>,
): QueryFunction<Args, R> {
  const key = uuid();

  const queryFunction = (...args: Args): Query<Args, R> => {
    return {
      key,
      args,
      id: id(...args),
      cacheTime,
      fetch,
    };
  };

  queryFunction.key = key;
  queryFunction.cacheTime = cacheTime;

  return queryFunction;
}

query.expand = expandedQuery;

// ---------------------------------------------
// util functions
// ---------------------------------------------
export function isQuery(obj: any): obj is Query<any, any> {
  return (
    !!obj &&
    typeof obj === 'object' &&
    typeof obj.key === 'string' &&
    Array.isArray(obj.args) &&
    typeof obj.fetch === 'function' &&
    typeof obj.id === 'string' &&
    typeof obj.cacheTime === 'number'
  );
}
