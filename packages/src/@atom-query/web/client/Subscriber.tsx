import { BehaviorSubject, filter, Observer, Subject, Subscription } from 'rxjs';
import { CompositedQueryResult, Compositor } from '../atoms/composit';
import { Job } from '../models';
import { JobLoop } from './JobLoop';

export interface Subscriber<Params extends {}, R> {
  subscribe: (observer: Partial<Observer<R>>) => Subscription;
  fetch: (params?: Params) => void;
  getSubscritionJobs: () => Job[];
  destroy: () => void;
}

export class SubscriberImpl<Params extends {}, R>
  implements Subscriber<Params, R>
{
  private subject = new BehaviorSubject<R | undefined>(undefined);

  private lastParams: Params | null = null;
  private requestedJobs: Job[] | null = null;
  private lastExecutedJobs: Job[] | null = null;

  private executed: boolean = false;

  private readonly compositedQuery: (
    params: Params,
  ) => CompositedQueryResult<R>;
  private readonly resultCollector: QueryResultCollector;

  constructor(
    private readonly compositor: Compositor<Params, R>,
    private readonly jobLoop: JobLoop,
  ) {
    this.compositedQuery = compositor.create();

    const { queries: dummyQueries, map } = this.compositedQuery({} as any);
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

    const { queries } = this.compositedQuery(nextParams);

    const keys = Object.keys(queries);

    const nextJobs: Job[] = [];

    for (const key of keys) {
      const query = queries[key];

      const job: Job = {
        key: query.key,
        params: query.params,
        fetch: query.fetch,
        callback: this.resultCollector.getCallback(key),
      };

      nextJobs.push(job);
    }

    this.requestedJobs = nextJobs;
    this.lastParams = nextParams;

    if (!this.executed) {
      setTimeout(this.execute, 1);
      this.executed = true;
    }
  };

  getSubscritionJobs = (): Job[] => {
    return this.lastExecutedJobs ?? [];
  };

  destroy = () => {
    this.subject.unsubscribe();
    this.resultCollector.destroy();
  };

  private execute = () => {
    this.executed = false;

    if (!this.requestedJobs) {
      throw new Error(`requestedJobs is null`);
    }

    for (const job of this.requestedJobs) {
      this.jobLoop.add(job);
    }

    this.lastExecutedJobs = this.requestedJobs;
    this.requestedJobs = null;
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
