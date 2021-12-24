import { delay } from '../../__helpers__/delay';
import { composit } from '../../atoms/composit';
import { query } from '../../atoms/query';
import { Job } from '../../models';
import { JobLoop } from '../JobLoop';
import { Subscriber } from '../Subscriber';

describe('Subscriber', () => {
  const x = query((a: number, b: number) => delay(a + b, 100));
  const y = query((a: number) => delay(a, 100));
  const z = query(() => delay('hello', 100));

  const c = composit((params: { a: number; b: number }) => ({
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
      const subscriptionJobsFns = new Set<() => Job[]>();

      function getSubscriptionJobs() {
        const arr = [];
        for (const fn of subscriptionJobsFns) {
          arr.push(...fn());
        }
        return arr;
      }

      const jobLoop = new JobLoop({ getSubscriptionJobs, debug: true });
      const subscriber1 = new Subscriber(c, jobLoop);
      const subscriber2 = new Subscriber(c1, jobLoop);

      subscriptionJobsFns.add(subscriber1.getSubscritionJobs);
      subscriptionJobsFns.add(subscriber2.getSubscritionJobs);

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

      expect(JobLoop.debug.latestJobsLength).toBe(6);
      expect(JobLoop.debug.latestDedupedJobsLength).toBe(3);

      // add and getSubscriptionJobs
      jobLoop.add({
        ...y(1),
        callback: jest.fn(),
      });

      await delay(null, 200);

      expect(value1).toBe(`3:1:hello:3`);
      expect(value2).toBe(`3:1:hello:4`);
      expect(JobLoop.debug.latestJobsLength).toBe(1);
      expect(JobLoop.debug.latestDedupedJobsLength).toBe(1);
    },
    1000 * 60 * 0.3,
  );
});
