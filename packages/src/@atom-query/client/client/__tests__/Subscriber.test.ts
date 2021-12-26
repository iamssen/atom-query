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
});
