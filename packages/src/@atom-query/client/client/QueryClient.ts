import { Compositor } from '../atoms/composit';
import { fetchQueries } from '../fetch/fetchQueries';
import { Job, QueriesResult, Query, Result } from '../models';
import { JobLoop } from './JobLoop';
import { Subscriber, SubscriberImpl } from './Subscriber';

interface Options {
  debug?: boolean;
}

export class QueryClient {
  private readonly jobLoop;
  private readonly subscribers = new Set<SubscriberImpl<any, any>>();

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
    ? Subscriber<Params, R>
    : T extends (params: infer Params) => infer QR
    ? Subscriber<
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

    const subscriber = new SubscriberImpl(compositor, this.jobLoop);

    this.subscribers.add(subscriber);

    let destroyed = false;

    const error = new Error(
      `subscriber is already destroyed. do not call this after destroy()`,
    );

    const proxy: Subscriber<any, any> = {
      subscribe: (observer) => {
        if (destroyed) {
          throw error;
        }
        return subscriber.subscribe(observer);
      },
      fetch: (params) => {
        if (destroyed) {
          throw error;
        }
        subscriber.fetch(params);
      },
      getSubscritionJobs: () => {
        if (destroyed) {
          throw error;
        }
        return subscriber.getSubscritionJobs();
      },
      destroy: () => {
        if (destroyed) {
          throw error;
        }
        subscriber.destroy();
        this.subscribers.delete(subscriber);
        destroyed = true;
      },
    };

    return proxy as any;
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
