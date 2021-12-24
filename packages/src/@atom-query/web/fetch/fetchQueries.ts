import { JobLoop } from '../client/JobLoop';
import { Job, QueriesResult, Query, Result } from '../models';

export async function fetchQueries<
  T extends { [key: string]: Query<any[], any> },
>(queries: T, jobLoop: JobLoop): Promise<QueriesResult<T>> {
  const promises: Promise<any>[] = [];

  const keys = Object.keys(queries);

  for (const key of keys) {
    const query = queries[key];

    let callback: ((result: Result<any>) => void) | null = null;

    const promise = new Promise<Result<any>>((resolve) => {
      callback = resolve;
    });

    const job: Job = {
      key: query.key,
      params: query.params,
      fetch: query.fetch,
      callback: callback!,
    };

    jobLoop.add(job);

    promises.push(promise);
  }

  return Promise.all(promises).then((results) => {
    return results.reduce((obj, result: Result<any>, i) => {
      obj[keys[i]] = result;
      return obj;
    }, {});
  });
}
