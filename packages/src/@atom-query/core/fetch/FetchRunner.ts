import { Query, Result } from '../types';
import { FetchWorker, Phase } from './FetchWorker';

type FID = string & { __fid: true };

export function createFID(query: Query<any, any>): FID {
  return (query.key + '///' + query.id) as FID;
}

const CLEANUP_INTERVAL = 1000 * 10;

export class FetchRunner {
  private workers = new Map<FID, FetchWorker>();

  private latestCleanup: number = Date.now();

  public readonly fetchCount = new Map<FID, number>();

  add = (query: Query<any, any>, callback: (value: Result<any>) => void) => {
    this.cleanup();

    const fid = createFID(query);

    const worker = this.workers.get(fid);

    if (!worker || worker.phase() === Phase.EXPIRED) {
      const newWorker = new FetchWorker(query);
      newWorker.add(callback);
      this.workers.set(fid, newWorker);

      this.increaseCount(fid);
    } else {
      worker.add(callback);
    }
  };

  deleteExpiredWorkers = () => {
    const fids = this.workers.keys();

    for (const fid of fids) {
      if (this.workers.get(fid)?.phase() === Phase.EXPIRED) {
        this.workers.delete(fid);
      }
    }
  };

  destroy = () => {
    for (const worker of this.workers.values()) {
      worker.destroy();
    }

    this.workers.clear();
  };

  private increaseCount = (fid: FID) => {
    const prev = this.fetchCount.get(fid) ?? 0;
    this.fetchCount.set(fid, prev + 1);
  };

  private cleanup = () => {
    if (
      this.workers.size === 0 ||
      Date.now() > this.latestCleanup + CLEANUP_INTERVAL
    ) {
      return;
    }

    this.deleteExpiredWorkers();

    this.latestCleanup = Date.now();
  };
}
