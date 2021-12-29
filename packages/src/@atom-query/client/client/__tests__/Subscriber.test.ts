import { delay } from '../../__helpers__/delay';
import { compose } from '../../atoms/compose';
import { query } from '../../atoms/query';
import { FetchTicket } from '../../models';
import { FetchLoop } from '../FetchLoop';
import { SubscriberImpl } from '../Subscriber';

describe('Subscriber', () => {
  const x = query((a: number, b: number) => delay(a + b, 100));
  const y = query((a: number) => delay(a, 100));
  const z = query(() => delay('hello', 100));

  const c = compose((params: { a: number; b: number }) => ({
    x: x(params.a, params.b),
    y: y(params.a),
    z: z(),
  }));

  const c1 = c.map((v) => {
    return v.x.succeed && v.y.succeed && v.z.succeed
      ? `${v.x.value}:${v.y.value}:${v.z.value}`
      : `fail`;
  });

  test(
    'subscribe test',
    async () => {
      const subscribingFetchTicketFns = new Set<() => FetchTicket[]>();

      function getSubscribingFetchTickets() {
        const arr = [];
        for (const fn of subscribingFetchTicketFns) {
          arr.push(...fn());
        }
        return arr;
      }

      const fetchLoop = new FetchLoop({
        getSubscribingFetchTickets: getSubscribingFetchTickets,
        debug: true,
      });
      const subscriber1 = new SubscriberImpl(c, fetchLoop);
      const subscriber2 = new SubscriberImpl(c1, fetchLoop);

      subscribingFetchTicketFns.add(subscriber1.getSubscribingFetchTickets);
      subscribingFetchTicketFns.add(subscriber2.getSubscribingFetchTickets);

      let value1: any;
      let value2: any;
      let count: number = 0;

      subscriber1.subscribe({
        next: (r) => {
          value1 =
            r.x.succeed && r.y.succeed && r.z.succeed
              ? `${r.x.value}:${r.y.value}:${r.z.value}:${++count}`
              : null;
        },
      });

      subscriber2.subscribe({
        next: (r) => {
          value2 = r + ':' + ++count;
        },
      });

      // fetch
      subscriber1.fetch({ a: 1, b: 2 });
      subscriber2.fetch({ a: 1, b: 2 });

      await delay(null, 200);

      expect(value1).toBe(`3:1:hello:1`);
      expect(value2).toBe(`3:1:hello:2`);

      expect(FetchLoop.debug.latestFetchTicketLength).toBe(6);
      expect(FetchLoop.debug.latestDedupedFetchTicketsLength).toBe(3);

      // add and getSubscriptionJobs
      fetchLoop.add({
        ...y(1),
        callback: jest.fn(),
      });

      await delay(null, 200);

      expect(value1).toBe(`3:1:hello:3`);
      expect(value2).toBe(`3:1:hello:4`);
      expect(FetchLoop.debug.latestFetchTicketLength).toBe(1);
      expect(FetchLoop.debug.latestDedupedFetchTicketsLength).toBe(1);
    },
    1000 * 60 * 0.3,
  );

  test('should get result on sequence', async () => {
    const ticket = query((v: number, t: number) => delay(v, t));

    const composer = compose((params: { v: number; t: number }) => ({
      x: ticket(params.v, params.t),
    }));

    const fetchLoop = new FetchLoop();

    const subscriber = new SubscriberImpl(composer, fetchLoop);

    let values: any[] = [];
    let count: number = 0;

    subscriber.subscribe({
      next: (r) => {
        values.push(r.x.succeed && r.x.value);
        count += 1;
      },
    });

    // do not pass result value (ignore) if there is newer fetchSequence
    // Case 1. if first fetch is respond after 2nd fetch
    // 1st fetch ----------------------> Ignore
    // 2nd fetch --------> OK
    subscriber.fetch({ v: 10, t: 100 });

    await delay(null, 10);

    subscriber.fetch({ v: 20, t: 10 });

    await delay(null, 200);

    expect(values).toEqual([20]);
    expect(count).toBe(1);

    // Case 2. if first fetch is respond beofre 2nd fetch
    // 1st fetch --------> OK
    // 2nd fetch ----------------------> OK
    values.length = 0;
    count = 0;

    subscriber.fetch({ v: 10, t: 50 });

    await delay(null, 10);

    subscriber.fetch({ v: 20, t: 100 });

    await delay(null, 200);

    expect(values).toEqual([10, 20]);
    expect(count).toBe(2);
  });

  test('should return queryKeys', () => {
    expect(c.queryKeys()).toEqual(['x', 'y', 'z']);
    expect(c1.queryKeys()).toEqual(['x', 'y', 'z']);
  });
});
