import { QueryParams } from './params/QueryParams';

// ---------------------------------------------
// result
// ---------------------------------------------
type Succeed<R> = {
  succeed: true;
  value: R;
};

type Fault = {
  succeed: false;
  error: unknown;
};

export type Result<R> = Succeed<R> | Fault;

export type QueriesResult<T extends { [key: string]: Query<any[], any> }> = {
  readonly [K in keyof T]: T[K] extends Query<any[], infer R>
    ? Result<R>
    : never;
};

export type QueriesValue<T extends { [key: string]: Result<any> }> = {
  readonly [P in keyof T]: T[P] extends Result<infer R> ? R : never;
};

export function pickQueriesValue<T extends { [key: string]: Result<any> }>(
  results: T,
): QueriesValue<T> {
  return Object.keys(results).reduce((obj, key) => {
    const result = results[key];
    //@ts-ignore
    obj[key] = result.succeed ? result.value : undefined;
    return obj;
  }, {}) as QueriesValue<T>;
}

// ---------------------------------------------
// query
// ---------------------------------------------
export interface Query<Args extends unknown[], R extends any> {
  key: symbol;
  params: QueryParams;
  fetch: (...args: Args) => Promise<R>;
}

export type QueryFunction<Args extends unknown[], R extends any> = ((
  ...args: Args
) => Query<Args, R>) & { key: symbol };

// ---------------------------------------------
// fetch
// ---------------------------------------------
export type FetchCallback<R> = (value: Result<R>) => void;

export interface FetchTicket<Args extends any[] = any[], R extends any = any> {
  key: symbol;
  params: QueryParams;
  fetch: (...args: Args) => Promise<R>;
  callback: FetchCallback<R>;
}

export type DedupedFetchTicket = Omit<FetchTicket, 'callback'> & {
  callbacks: Set<FetchCallback<any>>;
};
