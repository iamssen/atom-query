import { v4 as uuid } from 'uuid';
import { PrimitiveParams, Query, QueryFunction } from '../types';

export interface QueryOptions<T extends PrimitiveParams> {
  cacheTime?: number;
  id?: (params: T) => string;
}

export interface ExpandedQueryOptions<Args extends unknown[]> {
  cacheTime?: number;
  id: (...args: Args) => string;
}

export function createId(params: PrimitiveParams): string {
  const keys = Object.keys(params).sort();
  return keys.map((key) => `${key}=${params[key]}`).join('::');
}

export function query<T extends PrimitiveParams, R>(
  fetch: (params: T) => Promise<R>,
  { cacheTime = 1000, id = createId }: QueryOptions<T> = {},
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

function queryExpand<Args extends unknown[], R>(
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

query.expand = queryExpand;

export function isQuery(obj: any): obj is Query<any, any> {
  return (
    typeof obj === 'object' &&
    typeof obj.key === 'string' &&
    Array.isArray(obj.args) &&
    typeof obj.fetch === 'function' &&
    typeof obj.id === 'string' &&
    typeof obj.cacheTime === 'number'
  );
}
