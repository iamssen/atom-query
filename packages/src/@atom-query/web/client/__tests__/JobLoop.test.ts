import { delay } from '../../__helpers__/delay';
import { Job } from '../../models';
import { QueryParams } from '../../params/QueryParams';
import {
  addJobCallbacks,
  dedupeJobs,
  executeJobGroup,
  JobGroup,
  JobLoop,
} from '../JobLoop';

describe('JobLoop', () => {
  test('should dedupe jobs', () => {
    // Arrange
    const key1 = Symbol();
    const key2 = Symbol();
    const key3 = Symbol();

    const jobs1: Job[] = (
      [
        [key1, [1, 2]],
        [key1, [1, 2]],
        [key1, [1, 2]],
        [key1, [1, 2]],
        [key1, [1, 2]],
        [key1, [1, 2]],
        [key1, [1, 2]],
      ] as [symbol, unknown[]][]
    ).map(([key, args]) => ({
      key,
      params: new QueryParams(key as symbol, args),
      fetch: () => Promise.resolve(null),
      callback: () => {},
    }));

    const jobs2: Job[] = (
      [
        [key1, [1, 2]],
        [key1, [1, 2]],
        [key1, [3, 4]],
        [key2, [1, 2]],
        [key2, [3, 4]],
        [key1, [3, 4]],
        [key3, [1, 2]],
      ] as [symbol, unknown[]][]
    ).map(([key, args]) => ({
      key,
      params: new QueryParams(key as symbol, args),
      fetch: () => Promise.resolve(null),
      callback: () => {},
    }));

    // Act
    const dedupedJobs1 = dedupeJobs(jobs1);
    const dedupedJobs2 = dedupeJobs(jobs2);

    // Assert
    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key2).not.toBe(key3);

    expect(dedupedJobs1).toHaveLength(1);
    expect(dedupedJobs2).toHaveLength(5);
  });

  test('should throw error if queue is empty', () => {
    // Act / Assert
    expect(() => dedupeJobs([])).toThrow();
  });

  test('dedupeJobs performance test', () => {
    // Arrange
    const keys = [Symbol(), Symbol(), Symbol()];

    const jobs: Job[] = Array.from({ length: 100000 }, () => {
      const key = keys[Math.floor(Math.random() * keys.length)];
      const params = Math.random() > 0.5 ? [1, 2] : [2, 1];

      return {
        key,
        params: new QueryParams(key, params),
        fetch: () => Promise.resolve(null),
        callback: () => {},
      };
    });

    // Act
    console.time('dedupeJobs()');

    const dedupedJobs = dedupeJobs(jobs);

    console.timeEnd('dedupeJobs()');

    // Assert
    expect(dedupedJobs).toHaveLength(6);
  });

  test('should get succeed from executeJobGroup', async () => {
    // Arrange
    const key = Symbol();

    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const jobGroup: JobGroup = {
      key,
      params: new QueryParams(key, [1, 2]),
      fetch: (a: number, b: number) => delay(a + b, 100),
      callbacks: new Set([callback1, callback2]),
    };

    // Act
    await executeJobGroup(jobGroup);

    // Assert
    expect(callback1.mock.calls.length).toBe(1);
    expect(callback2.mock.calls.length).toBe(1);

    expect(callback1.mock.calls[0][0]).toEqual({ succeed: true, value: 3 });
    expect(callback2.mock.calls[0][0]).toEqual({ succeed: true, value: 3 });
  });

  test('should add callbacks to jobGroups', () => {
    const key = Symbol();

    const fetch = (a: number, b: number) => delay(a + b, 100);

    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const callback3 = jest.fn();

    const jobGroup: JobGroup = {
      key,
      params: new QueryParams(key, [1, 2]),
      fetch,
      callbacks: new Set([callback1]),
    };

    const jobs: Job[] = [
      {
        key,
        params: new QueryParams(key, [1, 2]),
        fetch,
        callback: callback1,
      },
      {
        key,
        params: new QueryParams(key, [1, 2]),
        fetch,
        callback: callback2,
      },
      {
        key,
        params: new QueryParams(key, [3, 4]),
        fetch,
        callback: callback3,
      },
    ];

    addJobCallbacks([jobGroup], jobs);

    expect(jobGroup.callbacks.size).toBe(2);
    expect(jobGroup.callbacks.has(callback1)).toBeTruthy();
    expect(jobGroup.callbacks.has(callback2)).toBeTruthy();
    expect(jobGroup.callbacks.has(callback3)).toBeFalsy();
  });

  test('should get failed from executeJobGroup', async () => {
    // Arrange
    const key = Symbol();

    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const jobGroup: JobGroup = {
      key,
      params: new QueryParams(key, [1, 2]),
      fetch: () => {
        throw new Error('error');
      },
      callbacks: new Set([callback1, callback2]),
    };

    // Act
    await executeJobGroup(jobGroup);

    // Assert
    expect(callback1.mock.calls.length).toBe(1);
    expect(callback2.mock.calls.length).toBe(1);

    expect(callback2.mock.calls[0][0].succeed).toBeFalsy();
    expect(callback1.mock.calls[0][0].succeed).toBeFalsy();
  });

  test('should get result from JobLoop.add', async () => {
    // Arrange
    const key = Symbol();

    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const callback3 = jest.fn();
    const callback4 = jest.fn();

    const getSubscriptionJobs = () => [
      {
        key,
        params: new QueryParams(key, [1, 2]),
        fetch: (a, b) => Promise.resolve(a + b),
        callback: callback3,
      } as Job,
      {
        key,
        params: new QueryParams(key, [5, 6]),
        fetch: () => {
          throw new Error();
        },
        callback: callback4,
      } as Job,
    ];

    const requestLoop = new JobLoop({ getSubscriptionJobs, debug: true });

    requestLoop.add({
      key,
      params: new QueryParams(key, [1, 2]),
      fetch: (a, b) => Promise.resolve(a + b),
      callback: callback1,
    });

    requestLoop.add({
      key,
      params: new QueryParams(key, [1, 2]),
      fetch: (a, b) => Promise.resolve(a + b),
      callback: callback2,
    });

    // Act
    await delay(null, 100);

    // Assert
    expect(callback1.mock.calls.length).toBe(1);
    expect(callback2.mock.calls.length).toBe(1);
    expect(callback3.mock.calls.length).toBe(1);
    expect(callback4.mock.calls.length).toBe(0);

    expect(callback1.mock.calls[0][0]).toEqual({ succeed: true, value: 3 });
    expect(callback2.mock.calls[0][0]).toEqual({ succeed: true, value: 3 });
    expect(callback3.mock.calls[0][0]).toEqual({ succeed: true, value: 3 });

    expect(JobLoop.debug.latestJobsLength).toBe(2);
    expect(JobLoop.debug.latestDedupedJobsLength).toBe(1);

    expect(requestLoop.queueSize).toBe(0);
  });
});
