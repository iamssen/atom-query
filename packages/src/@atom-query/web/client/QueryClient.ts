import { Compositor } from '../atoms/composit';
import { fetchQueries } from '../fetch/fetchQueries';
import { Job, QueriesResult, Query, Result } from '../models';
import { JobLoop } from './JobLoop';
import { ISubscriber, Subscriber } from './Subscriber';

interface Options {
  debug?: boolean;
}

export class QueryClient {
  private readonly jobLoop;
  private readonly subscribers = new Set<Subscriber<any, any>>();

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
        [K in keyof QR]: QR[K] extends Query<any, infer RR>
          ? Result<RR>
          : never;
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
  ): T extends Compositor<infer Params, infer R>
    ? ISubscriber<Params, R>
    : T extends (params: infer Params) => infer QR
    ? ISubscriber<
        Params,
        {
          [K in keyof QR]: QR[K] extends Query<any, infer RR>
            ? Result<RR>
            : never;
        }
      >
    : never => {
    const compositor: Compositor<any, any> =
      typeof source === 'function' ? new Compositor(source) : source;

    const subscriber = new Subscriber(compositor, this.jobLoop);

    this.subscribers.add(subscriber);

    const obj: ISubscriber<any, any> = {
      subscribe: subscriber.subscribe,
      fetch: subscriber.fetch,
      getSubscritionJobs: subscriber.getSubscritionJobs,
      destroy: () => {
        subscriber.destroy();
        this.subscribers.delete(subscriber);
      },
    };

    return obj as any;
  };

  getSubscriptions = (): Job[] => {
    const jobs = [];

    for (const subscriber of this.subscribers) {
      jobs.push(...subscriber.getSubscritionJobs());
    }

    return jobs;
  };

  invalidateSubscriptions = (...keys: symbol[]) => {
    const index = new Set<symbol>(keys);

    const jobs = this.getSubscriptions().filter(({ key }) => index.has(key));

    for (const job of jobs) {
      this.jobLoop.add(job);
    }
  };
}
