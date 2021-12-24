import { fetchQueries } from '@atom-query/web/fetch/fetchQueries';
import { Compositor } from '../atoms/composit';
import { Job, QueriesResult, Query, Result } from '../models';
import { JobLoop } from './JobLoop';

//export type UnifyResults<
//  Params extends {},
//  T extends { [key: string]: Query<any[], any> },
//> = {
//  observe: () => Observable<QueryResults<T>>;
//  fetch: (params: Params) => Promise<QueryResults<T>>;
//  refetch: (...keys: (keyof T)[]) => Promise<QueryResults<T>>;
//  destroy: () => void;
//};

interface Options {
  debug?: boolean;
}

export class QueryClient {
  private readonly jobLoop;

  constructor(private readonly options: Options = {}) {
    this.jobLoop = new JobLoop({
      debug: this.options.debug,
      getSubscriptionJobs: this.getSubscriptions,
    });
  }

  public fetch = <T extends { [key: string]: Query<any[], any> }>(
    queries: T,
  ): Promise<QueriesResult<T>> => {
    return fetchQueries(queries, this.jobLoop);
  };

  public createFetch = <
    T extends
      | Compositor<any, any>
      | ((params: any) => { [key: string]: Query<any[], any> }),
  >(
    source: T,
  ): T extends Compositor<infer Params, infer R>
    ? (params: Params) => Promise<R>
    : T extends (params: infer Params) => infer QR
    ? (params: Params) => Promise<{
        [K in keyof QR]: QR[K] extends Query<any, infer R> ? Result<R> : never;
      }>
    : never => {
    const compositor: Compositor<any, any> =
      typeof source === 'function' ? new Compositor(source) : source;
    const createCompositedQuery = compositor.create();

    return ((params: any) =>
      new Promise<any>((resolve) => {
        const { queries, map } = createCompositedQuery(params);

        fetchQueries(queries, this.jobLoop).then((queryResult) => {
          if (map) {
            resolve(map(queryResult));
          } else {
            resolve(queryResult);
          }
        });
      })) as any;
  };

  public createSubscribe = <
    T extends
      | Compositor<any, any>
      | ((params: any) => { [key: string]: Query<any[], any> }),
  >(
    source: T,
  ) => {};

  //private readonly unifyControllers = new Set<UnifyController<any, any>>();
  //
  //public unify = <
  //  Params extends {},
  //  T extends { [key: string]: Query<any[], any> },
  //>(
  //  fn: (params: Params) => T,
  //): UnifyResults<Params, T> => {
  //  const controller = new UnifyController<any, any>(fn, this.requestLoop);
  //
  //  this.unifyControllers.add(controller);
  //
  //  return {
  //    observe: controller.observe,
  //    fetch: controller.fetch,
  //    refetch: controller.refetch,
  //    destroy: () => {
  //      controller.destory();
  //      this.unifyControllers.delete(controller);
  //    },
  //  };
  //};
  //
  getSubscriptions = (): Job[] => {
    //const jobs = [];

    //for (const controller of this.unifyControllers) {
    //  jobs.push(...controller.getJobs());
    //}

    return [];
  };

  //invalidate = (...keys: symbol[]) => {
  //  const index = new Set<symbol>(keys);
  //
  //  const jobs = this.getSubscriptions().filter(({ key }) => index.has(key));
  //
  //  for (const job of jobs) {
  //    this.requestLoop.add(job);
  //  }
  //};
}
