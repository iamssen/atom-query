import { QueryOrValue, ResolvedResult } from '../types';

export type FetchOperator<
  Args extends unknown[],
  R extends Record<string, QueryOrValue<any>>,
> = (...args: Args) => R;

export type MapOperator<T, R> = (value: T) => Promise<R> | R;

export function compose<
  Args extends unknown[],
  R extends Record<string, QueryOrValue<any>>,
>(fetch: FetchOperator<Args, R>) {
  return new QueryComposer<Args, R>([fetch]);
}

//eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Sequence<Args extends unknown[], R> {
  args: Args;
  fetches: FetchOperator<any, any>[];
  mappers?: MapOperator<any, any>[];
}

export interface Composer<Args extends unknown[], R> {
  build: (...args: Args) => Sequence<Args, R>;
}

export class QueryComposer<
  Args extends unknown[],
  R extends Record<string, QueryOrValue<any>>,
> implements Composer<Args, R>
{
  constructor(private readonly fetches: FetchOperator<any, any>[]) {}

  then = <R2 extends Record<string, QueryOrValue<any>>>(
    fetch: FetchOperator<[ResolvedResult<R>], R2>,
  ): QueryComposer<Args, R2> => {
    return new QueryComposer<Args, R2>([
      ...this.fetches,
      fetch as FetchOperator<any, any>,
    ]);
  };

  map = <R2>(
    mapper: MapOperator<ResolvedResult<R>, R2>,
  ): MapComposer<Args, R2> => {
    return new MapComposer<Args, R2>(this.fetches, [mapper]);
  };

  build = (...args: Args): Sequence<Args, R> => {
    return {
      args,
      fetches: this.fetches,
    };
  };
}

export class MapComposer<Args extends unknown[], R>
  implements Composer<Args, R>
{
  constructor(
    private readonly fetches: ((...args: any[]) => any)[],
    private readonly mappers: ((value: any) => any)[],
  ) {}

  map = <R2>(mapper: MapOperator<R, R2>): MapComposer<Args, R2> => {
    return new MapComposer<Args, R2>(this.fetches, [...this.mappers, mapper]);
  };

  build = (...args: Args): Sequence<Args, R> => {
    return {
      args,
      fetches: this.fetches,
      mappers: this.mappers,
    };
  };
}

export function isComposer(obj: any): obj is Composer<any, any> {
  return obj instanceof QueryComposer || obj instanceof MapComposer;
}
