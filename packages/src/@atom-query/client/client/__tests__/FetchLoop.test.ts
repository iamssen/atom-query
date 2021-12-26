import { delay } from '../../__helpers__/delay';
import { DedupedFetchTicket, FetchTicket } from '../../models';
import { QueryParams } from '../../params/QueryParams';
import {
  dedupeFetchTickets,
  executeFetchTickets,
  FetchLoop,
  sampleMatchedTicketCallbacksIntoDedupedTickets,
} from '../FetchLoop';

describe('FetchLoop', () => {
  test('should dedupe fetches', () => {
    // Arrange
    const key1 = Symbol();
    const key2 = Symbol();
    const key3 = Symbol();

    const tickets1: FetchTicket[] = (
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

    const tickets2: FetchTicket[] = (
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
    const dedupedTickets1 = dedupeFetchTickets(tickets1);
    const dedupedTickets2 = dedupeFetchTickets(tickets2);

    // Assert
    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key2).not.toBe(key3);

    expect(dedupedTickets1).toHaveLength(1);
    expect(dedupedTickets2).toHaveLength(5);
  });

  test('should throw error if queue is empty', () => {
    // Act / Assert
    expect(() => dedupeFetchTickets([])).toThrow();
  });

  test('dedupeTickets() performance test', () => {
    // Arrange
    const keys = [Symbol(), Symbol(), Symbol()];

    const tickets: FetchTicket[] = Array.from({ length: 100000 }, () => {
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
    console.time('dedupeTickets()');

    const dedupedTickets = dedupeFetchTickets(tickets);

    console.timeEnd('dedupeTickets()');

    // Assert
    expect(dedupedTickets).toHaveLength(6);
  });

  test('should get succeed from executeFetchTickets', async () => {
    // Arrange
    const key = Symbol();

    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const ticket: DedupedFetchTicket = {
      key,
      params: new QueryParams(key, [1, 2]),
      fetch: (a: number, b: number) => delay(a + b, 100),
      callbacks: new Set([callback1, callback2]),
    };

    // Act
    await executeFetchTickets(ticket);

    // Assert
    expect(callback1.mock.calls.length).toBe(1);
    expect(callback2.mock.calls.length).toBe(1);

    expect(callback1.mock.calls[0][0]).toEqual({ succeed: true, value: 3 });
    expect(callback2.mock.calls[0][0]).toEqual({ succeed: true, value: 3 });
  });

  test('should add callbacks to dedupedFetchTickets', () => {
    const key = Symbol();

    const fetch = (a: number, b: number) => delay(a + b, 100);

    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const callback3 = jest.fn();

    const dedupedTicket: DedupedFetchTicket = {
      key,
      params: new QueryParams(key, [1, 2]),
      fetch,
      callbacks: new Set([callback1]),
    };

    const tickets: FetchTicket[] = [
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

    sampleMatchedTicketCallbacksIntoDedupedTickets([dedupedTicket], tickets);

    expect(dedupedTicket.callbacks.size).toBe(2);
    expect(dedupedTicket.callbacks.has(callback1)).toBeTruthy();
    expect(dedupedTicket.callbacks.has(callback2)).toBeTruthy();
    expect(dedupedTicket.callbacks.has(callback3)).toBeFalsy();
  });

  test('should get failed from executeFetchTickets', async () => {
    // Arrange
    const key = Symbol();

    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const dedupedFetchTicket: DedupedFetchTicket = {
      key,
      params: new QueryParams(key, [1, 2]),
      fetch: () => {
        throw new Error('error');
      },
      callbacks: new Set([callback1, callback2]),
    };

    // Act
    await executeFetchTickets(dedupedFetchTicket);

    // Assert
    expect(callback1.mock.calls.length).toBe(1);
    expect(callback2.mock.calls.length).toBe(1);

    expect(callback2.mock.calls[0][0].succeed).toBeFalsy();
    expect(callback1.mock.calls[0][0].succeed).toBeFalsy();
  });

  test('should get result from FetchLoop.add', async () => {
    // Arrange
    const key = Symbol();

    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const callback3 = jest.fn();
    const callback4 = jest.fn();

    const getSubscribingFetchTickets = () => [
      {
        key,
        params: new QueryParams(key, [1, 2]),
        fetch: (a, b) => Promise.resolve(a + b),
        callback: callback3,
      } as FetchTicket,
      {
        key,
        params: new QueryParams(key, [5, 6]),
        fetch: () => {
          throw new Error();
        },
        callback: callback4,
      } as FetchTicket,
    ];

    const fetchLoop = new FetchLoop({
      getSubscribingFetchTickets,
      debug: true,
    });

    fetchLoop.add({
      key,
      params: new QueryParams(key, [1, 2]),
      fetch: (a, b) => Promise.resolve(a + b),
      callback: callback1,
    });

    fetchLoop.add({
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

    expect(FetchLoop.debug.latestFetchTicketLength).toBe(2);
    expect(FetchLoop.debug.latestDedupedFetchTicketsLength).toBe(1);

    expect(fetchLoop.queueSize).toBe(0);
  });
});
