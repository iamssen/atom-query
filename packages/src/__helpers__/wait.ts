import { delay } from './delay';

interface Options {
  interval?: number;
  timeout?: number;
}

export async function wait(
  fn: () => boolean,
  { interval = 10, timeout = 1000 }: Options = {},
) {
  const endTime = Date.now() + timeout;

  while (true) {
    if (fn()) {
      break;
    } else if (Date.now() > endTime) {
      throw new Error(`Failed to succeed while waiting`);
    } else {
      await delay(null, interval);
    }
  }
}
