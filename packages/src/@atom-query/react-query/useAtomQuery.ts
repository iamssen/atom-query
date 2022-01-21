import { Composer } from '@atom-query/core';
import { useMemo } from 'react';
import {
  QueryFunctionContext,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from 'react-query';
import { useAtomQueryFetch } from './AtomQueryProvider';

export function createQueryFn<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
): (ctx: QueryFunctionContext<[string, ...T]>) => Promise<R> {
  return ({ queryKey: [, ...args] }) => {
    return fn(...(args as T));
  };
}

export function useAtomQuery<Args extends unknown[], R>(
  key: string,
  composer: Composer<Args, R>,
  args: Args,
  options?: Omit<UseQueryOptions<R>, 'queryKey' | 'queryFn'>,
): UseQueryResult<R> {
  const fetchFn = useAtomQueryFetch<Args, R>(composer);

  const queryFn = useMemo(() => {
    return createQueryFn<Args, R>(fetchFn as any);
  }, [fetchFn]);

  return useQuery({
    queryKey: [key, ...args],
    queryFn,
    ...(options as any),
  });
}
