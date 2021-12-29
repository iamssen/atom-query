import { QueryComposer } from '../atoms/compose';
import { fetchQueries } from '../fetch/fetchQueries';
import { FetchTicket, QueriesResult, Query, Result } from '../models';
import { FetchLoop } from './FetchLoop';
import { Subscriber, SubscriberImpl } from './Subscriber';

interface Options {
  debug?: boolean;
}

export class QueryClient {
  private readonly fetchLoop;
  private readonly subscribers = new Set<SubscriberImpl<any, any>>();

  constructor(private readonly options: Options = {}) {
    this.fetchLoop = new FetchLoop({
      debug: this.options.debug,
      getSubscribingFetchTickets: this.getSubscribingFetchTickets,
    });
  }

  public fetch = <T extends { [key: string]: Query<any[], any> }>(
    queries: T,
  ): Promise<QueriesResult<T>> => {
    return fetchQueries(queries, this.fetchLoop);
  };

  public createFetch = <
    T extends
      | QueryComposer<any, any>
      | ((params: any) => { [key: string]: Query<any[], any> }),
  >(
    source: T,
  ): T extends QueryComposer<infer Params, infer R>
    ? (params: Params) => Promise<R>
    : T extends (params: infer Params) => infer QR
    ? (params: Params) => Promise<{
        [K in keyof QR]: QR[K] extends Query<any, infer RR>
          ? Result<RR>
          : never;
      }>
    : never => {
    return this.createComposerFetch(source);
  };

  public createSubscribe = <
    T extends
      | QueryComposer<any, any>
      | ((params: any) => { [key: string]: Query<any[], any> }),
  >(
    source: T,
  ): T extends QueryComposer<infer Params, infer R>
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
    return this.createComposerSubscribe(source);
  };

  getSubscribingFetchTickets = (): FetchTicket[] => {
    const tickets = [];

    for (const subscriber of this.subscribers) {
      tickets.push(...subscriber.getSubscribingFetchTickets());
    }

    return tickets;
  };

  invalidateSubscriptions = (...keys: symbol[]) => {
    const index = new Set<symbol>(keys);

    const tickets = this.getSubscribingFetchTickets().filter(({ key }) =>
      index.has(key),
    );

    for (const ticket of tickets) {
      this.fetchLoop.add(ticket);
    }
  };

  // ---------------------------------------------
  //
  // ---------------------------------------------
  private createComposerFetch = <
    T extends
      | QueryComposer<any, any>
      | ((params: any) => { [key: string]: Query<any[], any> }),
  >(
    source: T,
  ): T extends QueryComposer<infer Params, infer R>
    ? (params: Params) => Promise<R>
    : T extends (params: infer Params) => infer QR
    ? (params: Params) => Promise<{
        [K in keyof QR]: QR[K] extends Query<any, infer RR>
          ? Result<RR>
          : never;
      }>
    : never => {
    const composer: QueryComposer<any, any> =
      typeof source === 'function' ? new QueryComposer(source) : source;

    const createComposedQuery = composer.create();

    return ((params: any) =>
      new Promise<any>((resolve) => {
        const r = createComposedQuery(params);

        if ('result' in r) {
          resolve(r.result);
        } else {
          fetchQueries(r.queries, this.fetchLoop).then((queryResult) => {
            if (r.map) {
              resolve(r.map(queryResult));
            } else {
              resolve(queryResult);
            }
          });
        }
      })) as any;
  };

  private createComposerSubscribe = <
    T extends
      | QueryComposer<any, any>
      | ((params: any) => { [key: string]: Query<any[], any> }),
  >(
    source: T,
  ): T extends QueryComposer<infer Params, infer R>
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
    const composer: QueryComposer<any, any> =
      typeof source === 'function' ? new QueryComposer(source) : source;

    const subscriber = new SubscriberImpl(composer, this.fetchLoop);

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
      getSubscribingFetchTickets: () => {
        if (destroyed) {
          throw error;
        }
        return subscriber.getSubscribingFetchTickets();
      },
      destroy: () => {
        if (destroyed) {
          return;
        }
        subscriber.destroy();
        this.subscribers.delete(subscriber);
        destroyed = true;
      },
    };

    return proxy as any;
  };
}
