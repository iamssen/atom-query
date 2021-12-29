import { dummyParams } from '../client/dummyParams';
import { QueriesResult, Query } from '../models';

export function compose<
  Params extends {},
  R extends { [key: string]: Query<any, any> },
>(fn: (params: Params) => R) {
  return new QueryComposer<Params, QueriesResult<R>>(fn);
}

type MapOperator<T, R> = (x: T) => R | Promise<R>;

type InterceptOperator<Params extends {}, Params2 extends {}, R2 = any> = (
  params: Params2,
  next: (params: Params) => void,
  intercept: (result: R2) => void,
) => void;

export type ComposedQueryResult<R> = {
  queries: { [key: string]: Query<any, any> };
  map?: (queryResult: any) => Promise<R>;
};

export type InterceptedQueryResult<R> = {
  result: R;
};

export type CreateComposedQuery<Params extends {}, R> = (
  params: Params,
) => ComposedQueryResult<R> | InterceptedQueryResult<R>;

export class QueryComposer<Params extends {}, R> {
  private mappers: MapOperator<any, any>[] = [];
  private intercepters: InterceptOperator<any, any>[] = [];

  constructor(
    private readonly fn: (params: Params) => { [key: string]: Query<any, any> },
  ) {}

  map = <R2>(op: MapOperator<R, R2>): QueryComposer<Params, R2> => {
    const next = new QueryComposer<Params, R2>(this.fn);
    next.mappers = [...this.mappers, op];
    return next;
  };

  intercept = <Params2 extends {}, R2 = any>(
    op: InterceptOperator<Params, Params2, R2>,
  ): QueryComposer<Params2, R | R2> => {
    const next = new QueryComposer<Params2, R | R2>(this.fn as any);
    next.intercepters = [op, ...this.intercepters];
    return next;
  };

  create =
    (): CreateComposedQuery<Params, R> =>
    (params: Params): ComposedQueryResult<R> | InterceptedQueryResult<R> => {
      let resolvedParams: any = params;

      if (this.intercepters.length > 0) {
        let i: number = -1;
        const max: number = this.intercepters.length;
        while (++i < max) {
          const interceptResult = resolveIntercept(
            this.intercepters[i],
            resolvedParams,
          );

          if (interceptResult.type === 'next') {
            resolvedParams = interceptResult.params;
          } else {
            return {
              result: interceptResult.result,
            };
          }
        }
      }

      const queries: { [key: string]: Query<any[], any> } =
        this.fn(resolvedParams);

      if (this.mappers.length === 0) {
        return { queries };
      }

      return {
        queries,
        map: this.createMap(),
      };
    };

  queryKeys = (): string[] => {
    return Object.keys(this.fn(dummyParams));
  };

  createMap = () => {
    if (this.mappers.length === 0) {
      return undefined;
    }

    return async (queryResult: any): Promise<R> => {
      let currentValue = queryResult;

      for (const fn of this.mappers) {
        currentValue = await fn(currentValue);
      }

      return currentValue as R;
    };
  };
}

interface InterceptNext {
  type: 'next';
  params: any;
}

interface InterceptCatch {
  type: 'catch';
  result: any;
}

function resolveIntercept(
  op: InterceptOperator<any, any>,
  params: any,
): InterceptNext | InterceptCatch {
  let result: InterceptNext | InterceptCatch;

  function next(nextParams: any) {
    result = {
      type: 'next',
      params: nextParams,
    };
  }

  function intercept(catchedResult: any) {
    result = {
      type: 'catch',
      result: catchedResult,
    };
  }

  op(params, next, intercept);

  return result!;
}
