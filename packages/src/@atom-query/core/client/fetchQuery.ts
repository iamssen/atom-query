import { FetchRunner } from '../fetch/FetchRunner';
import { Query, Result } from '../types';

let globalFetchRunner: FetchRunner;

function getGlobalFetchRunner(): FetchRunner {
  if (!globalFetchRunner) {
    globalFetchRunner = new FetchRunner();
  }

  return globalFetchRunner;
}

export function fetchQuery<T extends Record<string, Query<any, any>>>(
  obj: T,
  runner: FetchRunner = getGlobalFetchRunner(),
): Promise<{
  readonly [K in keyof T]: T[K] extends Query<any, infer R> ? Result<R> : never;
}> {
  const promises: Promise<any>[] = [];
  const keys = Object.keys(obj);

  for (const key of keys) {
    const query = obj[key];

    let callback: ((result: Result<any>) => void) | null = null;

    const promise = new Promise<Result<any>>((resolve) => {
      callback = resolve;
    });

    if (!callback) {
      throw new Error(`callback did not created`);
    }

    runner.add(query, callback);

    promises.push(promise);
  }

  return Promise.all(promises).then((results) => {
    return results.reduce((resultObject, result: Result<any>, i) => {
      resultObject[keys[i]] = result;
      return resultObject;
    }, {});
  });
}
