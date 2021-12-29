import { BehaviorSubject, filter, Observer, Subject, Subscription } from 'rxjs';
import { CreateComposedQuery, QueryComposer } from '../atoms/compose';
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

  private readonly createComposedQuery: CreateComposedQuery<Params, R>;

  private readonly fetchResultCombiner: FetchResultCombiner;

  constructor(
    private readonly composer: QueryComposer<Params, R>,
    private readonly fetchLoop: FetchLoop,
  ) {
    this.createComposedQuery = composer.create();

    const queryKeys = composer.queryKeys();
    const map = composer.createMap();

    this.fetchResultCombiner = new FetchResultCombiner(queryKeys);

    this.fetchResultCombiner.subscribe({
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

    const r = this.createComposedQuery(nextParams);

    if ('result' in r) {
      this.subject.next(r.result);

      this.fetchResultCombiner.clear();
      this.requestedTickets = null;
      this.lastParams = nextParams;
      this.executed = false;
    } else {
      const keys = Object.keys(r.queries);

      const nextTickets: FetchTicket[] = [];

      const fetchTime: number = Date.now();

      for (const key of keys) {
        const query = r.queries[key];

        const ticket: FetchTicket = {
          key: query.key,
          params: query.params,
          fetch: query.fetch,
          callback: this.fetchResultCombiner.getCallback(key, fetchTime),
        };

        nextTickets.push(ticket);
      }

      this.requestedTickets = nextTickets;
      this.lastParams = nextParams;

      if (!this.executed) {
        setTimeout(this.execute, 1);
        this.executed = true;
      }
    }
  };

  getSubscribingFetchTickets = (): FetchTicket[] => {
    return this.lastExecutedTickets ?? [];
  };

  destroy = () => {
    this.subject.unsubscribe();
    this.fetchResultCombiner.destroy();
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

class FetchResultCombiner {
  private subject = new Subject();
  private values = new Map<string, any>();
  private callbacks: Map<string, (value: any) => void>;

  private executed: boolean = false;

  private sequences: Map<string, Set<number>>;

  constructor(private keys: string[]) {
    this.callbacks = new Map<string, (value: any) => void>();
    this.sequences = new Map<string, Set<number>>();

    for (const key of keys) {
      this.sequences.set(key, new Set<number>());

      this.callbacks.set(key, (value: any) => {
        this.values.set(key, value);

        if (!this.executed) {
          setTimeout(this.check, 1);
          this.executed = true;
        }
      });
    }
  }

  getCallback = (key: string, time: number) => {
    if (!this.callbacks.has(key)) {
      throw new Error(`Undefined callback for "${key}"`);
    }

    const callback = this.callbacks.get(key)!;
    const sequence = this.sequences.get(key)!;

    // do not pass result value (ignore) if there is newer fetchSequence
    // Case 1. if first fetch is respond after 2nd fetch
    // 1st fetch ----------------------> Ignore
    // 2nd fetch --------> OK
    // Case 2. if first fetch is respond beofre 2nd fetch
    // 1st fetch --------> OK
    // 2nd fetch ----------------------> OK
    sequence.add(time);

    return (value: any) => {
      if (sequence.has(time)) {
        callback(value);
      }

      // remove staled sequence
      for (const seqTime of sequence) {
        if (seqTime < time) {
          sequence.delete(seqTime);
        }
      }
    };
  };

  subscribe = (observer: Partial<Observer<any>>) => {
    return this.subject.subscribe(observer);
  };

  destroy = () => {
    this.subject.unsubscribe();
  };

  clear = () => {
    this.sequences.clear();
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
