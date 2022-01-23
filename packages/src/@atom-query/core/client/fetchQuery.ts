import { isQuery } from '../atoms/query';
import { FetchRunner } from '../fetch/FetchRunner';
import { QueryOrValue, ResolvedResult, Result } from '../types';

let globalFetchRunner: FetchRunner;

function getGlobalFetchRunner(): FetchRunner {
  if (!globalFetchRunner) {
    globalFetchRunner = new FetchRunner();
  }

  return globalFetchRunner;
}

export function fetchQuery<T extends Record<string, QueryOrValue<any>>>(
  obj: T,
  runner: FetchRunner = getGlobalFetchRunner(),
): Promise<ResolvedResult<T>> {
  const promises: Promise<any>[] = [];
  const keys = Object.keys(obj);

  for (const key of keys) {
    const queryOrValue = obj[key];

    if (isQuery(queryOrValue)) {
      let callback: ((result: Result<any>) => void) | null = null;

      const promise = new Promise<Result<any>>((resolve) => {
        callback = resolve;
      });

      if (!callback) {
        throw new Error(`callback did not created`);
      }

      runner.add(queryOrValue, callback);

      promises.push(promise);
    } else {
      promises.push(
        Promise.resolve({
          success: true,
          value: queryOrValue,
        } as Result<any>),
      );
    }
  }

  return Promise.all(promises).then((results) => {
    return results.reduce((resultObject, result: Result<any>, i) => {
      resultObject[keys[i]] = result;
      return resultObject;
    }, {});
  });
}
