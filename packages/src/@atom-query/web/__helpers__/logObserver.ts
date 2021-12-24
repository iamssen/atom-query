import { Observer } from 'rxjs';

type Log = { type: 'next' | 'error' | 'complete'; value?: any };

export function createLogObserver(): { observer: Observer<any>; log: Log[] } {
  const log: Log[] = [];
  const observer: Observer<any> = {
    next: (value) => {
      log.push({ type: 'next', value });
    },
    error: (error) => {
      log.push({ type: 'error', value: error });
    },
    complete: () => {
      log.push({ type: 'complete', value: null });
    },
  };

  return { observer, log };
}
