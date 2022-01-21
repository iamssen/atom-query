import { Query, Result } from '../types';

export enum Phase {
  FETCHING = 'FETCHING',
  CACHED = 'CACHED',
  EXPIRED = 'EXPIRED',
}

export class FetchWorker {
  private staleTime: number = Infinity;
  private result: Result<any> | null = null;
  private callbacks = new Set<(result: Result<any>) => void>();
  private destroyed: boolean = false;

  constructor(public readonly query: Query<any, any>) {
    this.query
      .fetch(...this.query.args)
      .then((value) => {
        this.result = {
          success: true,
          value,
        };
        this.staleTime = Date.now() + this.query.cacheTime;
      })
      .catch((error) => {
        this.result = {
          success: false,
          error,
        };
        this.staleTime = 0;
      })
      .finally(() => {
        for (const callback of this.callbacks) {
          callback(this.result!);
        }
        this.callbacks.clear();
      });
  }

  phase = (): Phase => {
    const now = Date.now();

    if (this.destroyed || now > this.staleTime) {
      return Phase.EXPIRED;
    } else if (!!this.result && this.staleTime !== Infinity) {
      return Phase.CACHED;
    } else {
      return Phase.FETCHING;
    }
  };

  add = (callback: (result: Result<any>) => void) => {
    const phase = this.phase();

    if (phase === Phase.EXPIRED) {
      throw new Error(`FetchResolver(${this.query.id}) is expired`);
    } else if (phase === Phase.CACHED) {
      callback(this.result!);
    } else {
      this.callbacks.add(callback);
    }
  };

  remove = (callback: (result: Result<any>) => void) => {
    if (this.callbacks.has(callback)) {
      this.callbacks.delete(callback);
    }
  };

  destroy = () => {
    this.destroyed = true;
    this.callbacks.clear();
  };
}
