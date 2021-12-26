import { BehaviorSubject, filter, Observer, Subject, Subscription } from 'rxjs';
import { ComposedQueryResult, QueryComposer } from '../atoms/compose';
import { FetchTicket } from '../models';
import { FetchLoop } from './FetchLoop';

export interface Subscriber<Params extends {}, R> {
  subscribe: (observer: Partial<Observer<R>>) => Subscription;
  fetch: (params?: Params) => void;
  getSubscribingFetchTickets: () => FetchTicket[];
  destroy: () => void;
}

export class SubscriberImpl<Params extends {}, R>
  implements Subscriber<Params, R>
{
  private subject = new BehaviorSubject<R | undefined>(undefined);

  private lastParams: Params | null = null;
  private requestedTickets: FetchTicket[] | null = null;
  private lastExecutedTickets: FetchTicket[] | null = null;

  private executed: boolean = false;

  private readonly composedQueryResult: (
    params: Params,
  ) => ComposedQueryResult<R>;

  private readonly resultCollector: QueryResultCollector;

  constructor(
    private readonly composer: QueryComposer<Params, R>,
    private readonly fetchLoop: FetchLoop,
  ) {
    this.composedQueryResult = composer.create();

    const { queries: dummyQueries, map } = this.composedQueryResult({} as any);
    this.resultCollector = new QueryResultCollector(Object.keys(dummyQueries));

    this.resultCollector.subscribe({
      next: (value) => {
        const nextResult = map ? map(value) : value;

        Promise.resolve(nextResult).then((v) => this.subject.next(v));
      },
    });
  }

  subscribe = (observer: Partial<Observer<R>>): Subscription => {
    return this.subject
      .asObservable()
      .pipe(filter((value: R | undefined): value is R => !!value))
      .subscribe(observer);
  };

  fetch = (params?: Params) => {
    const nextParams = params ?? this.lastParams;

    if (!nextParams) {
      return;
    }

    const { queries } = this.composedQueryResult(nextParams);

    const keys = Object.keys(queries);

    const nextTickets: FetchTicket[] = [];

    for (const key of keys) {
      const query = queries[key];

      const ticket: FetchTicket = {
        key: query.key,
        params: query.params,
        fetch: query.fetch,
        callback: this.resultCollector.getCallback(key),
      };

      nextTickets.push(ticket);
    }

    this.requestedTickets = nextTickets;
    this.lastParams = nextParams;

    if (!this.executed) {
      setTimeout(this.execute, 1);
      this.executed = true;
    }
  };

  getSubscribingFetchTickets = (): FetchTicket[] => {
    return this.lastExecutedTickets ?? [];
  };

  destroy = () => {
    this.subject.unsubscribe();
    this.resultCollector.destroy();
  };

  private execute = () => {
    this.executed = false;

    if (!this.requestedTickets) {
      throw new Error(`requestedTickets is null`);
    }

    for (const ticket of this.requestedTickets) {
      this.fetchLoop.add(ticket);
    }

    this.lastExecutedTickets = this.requestedTickets;
    this.requestedTickets = null;
  };
}

class QueryResultCollector {
  private subject = new Subject();
  private values = new Map<string, any>();
  private callbacks: Map<string, (value: any) => void>;

  private executed: boolean = false;

  constructor(private keys: string[]) {
    this.callbacks = new Map<string, (value: any) => void>();

    for (const key of keys) {
      this.callbacks.set(key, (value: any) => {
        this.values.set(key, value);

        if (!this.executed) {
          setTimeout(this.check, 1);
          this.executed = true;
        }
      });
    }
  }

  getCallback = (key: string) => {
    if (!this.callbacks.has(key)) {
      throw new Error(`Undefined callback for "${key}"`);
    }
    return this.callbacks.get(key)!;
  };

  subscribe = (observer: Partial<Observer<any>>) => {
    return this.subject.subscribe(observer);
  };

  destroy = () => {
    this.subject.unsubscribe();
  };

  private check = () => {
    if (this.values.size === this.keys.length) {
      const result: Record<string, any> = {};

      for (const [key, value] of this.values) {
        result[key] = value;
      }

      this.subject.next(result);
    }

    this.executed = false;
  };
}
