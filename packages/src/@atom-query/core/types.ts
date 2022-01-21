export type Primitive = string | number | boolean | null | undefined;
export type PrimitiveParams = Record<string, Primitive>;

export interface Query<Args extends unknown[], R> {
  key: string;
  args: Args;
  fetch: (...args: Args) => Promise<R>;
  id: string;
  cacheTime: number;
}

export type QueryFunction<Args extends unknown[], R> = ((
  ...args: Args
) => Query<Args, R>) & { key: string; cacheTime: number };

export interface Succeed<T> {
  success: true;
  value: T;
}

export interface Fault {
  success: false;
  error: unknown;
}

export type Result<T> = Succeed<T> | Fault;

export type QueryOrValue<T> = Query<any, T> | T;

export type ResolvedResult<T extends Record<string, QueryOrValue<any>>> = {
  readonly [K in keyof T]: T[K] extends QueryOrValue<infer R>
    ? Result<R>
    : never;
};
