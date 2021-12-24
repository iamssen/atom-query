import { Query, QueryFunction } from '../models';
import { QueryParams } from '../params/QueryParams';

export function query<Args extends unknown[], R extends any>(
  fetch: (...args: Args) => Promise<R>,
): QueryFunction<Args, R> {
  const key = Symbol();

  const queryFunction = (...args: Args): Query<Args, R> => {
    return {
      key,
      params: new QueryParams(key, args),
      fetch,
    };
  };

  queryFunction.key = key;

  return queryFunction;
}
