import { Composer } from '@atom-query/core';
import { useMemo } from 'react';
import {
  QueryFunctionContext,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from 'react-query';
import { useAtomQueryFetch } from './AtomQueryProvider';
import { useValueInvalidate } from './useValueInvalidate';

export function createQueryFn<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
): (ctx: QueryFunctionContext<[string, ...T]>) => Promise<R> {
  return ({ queryKey: [, ...args] }) => {
    return fn(...(args as T));
  };
}

/**
 * Wrapped useQuery() of react-query with AtomQuery
 *
 * @param key pass to react-query `useQuery(key)`
 * @param composer Composer object
 * @param args pass to composer `compose(...args)`
 * @param options pass to react-query `useQuery(_, options)`
 *
 * @example
 * ```
 * const com = compose((a: number, b: number) => {
 *   return {
 *     x: foo({ a }),
 *     y: bar({ b }),
 *   }
 * }).map(({ x, y }) => {
 *   return x.success && y.success
 *     ? x.value + y.value
 *     : 0
 * })
 *
 * const { data: value } = useAtomQuery('queryKey', com, [ 1, 2 ])
 * ```
 */
export function useAtomQuery<Args extends unknown[], R>(
  key: string,
  composer: Composer<Args, R>,
  args: Args,
  options?: Omit<UseQueryOptions<R>, 'queryKey' | 'queryFn'>,
): UseQueryResult<R> {
  const fetchFn = useAtomQueryFetch<Args, R>(composer);

  const invalidatedArgs = useValueInvalidate(args);

  const queryFn = useMemo(() => {
    return createQueryFn<Args, R>(fetchFn as any);
  }, [fetchFn]);

  return useQuery({
    queryKey: [key, ...invalidatedArgs],
    queryFn,
    ...(options as any),
  });
}
