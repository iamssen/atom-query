import { delay } from '../../__helpers__/delay';
import { composit } from '../../atoms/composit';
import { query } from '../../atoms/query';
import { pickQueriesValue, Result } from '../../models';
import { JobLoop } from '../JobLoop';
import { QueryClient } from '../QueryClient';

describe('QueryClient', () => {
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

  test('fetch test', async () => {
    const queryClient = new QueryClient();

    const result = await queryClient.fetch({
      a: x(1, 2),
      b: y(3),
      c: x(1, 2),
      d: y(3),
      e: z(),
    });

    expect(pickQueriesValue(result)).toEqual({
      a: 3,
      b: 3,
      c: 3,
      d: 3,
      e: 'hello',
    });
  });

  test('dedupe test', async () => {
    const queryClient = new QueryClient({ debug: true });

    const [result1, result2] = await Promise.all([
      queryClient.fetch({
        a: x(1, 2),
        b: y(3),
        c: x(1, 2),
        d: y(3),
        e: z(),
      }),
      queryClient.fetch({
        a: x(1, 2),
        b: y(3),
        c: x(1, 2),
        d: y(3),
        e: z(),
      }),
    ]);

    expect(pickQueriesValue(result1)).toEqual({
      a: 3,
      b: 3,
      c: 3,
      d: 3,
      e: 'hello',
    });

    expect(pickQueriesValue(result2)).toEqual({
      a: 3,
      b: 3,
      c: 3,
      d: 3,
      e: 'hello',
    });

    expect(JobLoop.debug.latestJobsLength).toBe(10);
    expect(JobLoop.debug.latestDedupedJobsLength).toBe(3);
  });

  test('createFetch test', async () => {
    const queryClient = new QueryClient();

    type ExpectedType = (params: {
      a: number;
      b: number;
    }) => Promise<{ x: Result<number>; y: Result<number>; z: Result<string> }>;

    const fetch1: ExpectedType = queryClient.createFetch(c);

    const fetch2: (params: { a: number; b: number }) => Promise<string> =
      queryClient.createFetch(c1);

    const fetch3: ExpectedType = queryClient.createFetch(
      (params: { a: number; b: number }) => ({
        x: x(params.a, params.b),
        y: y(params.a),
        z: z(),
      }),
    );

    await expect(fetch1({ a: 1, b: 2 })).resolves.toEqual({
      x: {
        succeed: true,
        value: 3,
      },
      y: {
        succeed: true,
        value: 1,
      },
      z: {
        succeed: true,
        value: 'hello',
      },
    });

    await expect(fetch2({ a: 1, b: 2 })).resolves.toEqual('3:1:hello');

    await expect(fetch3({ a: 1, b: 2 })).resolves.toEqual({
      x: {
        succeed: true,
        value: 3,
      },
      y: {
        succeed: true,
        value: 1,
      },
      z: {
        succeed: true,
        value: 'hello',
      },
    });
  });

  test('subscribe test', async () => {
    const queryClient = new QueryClient();

    const { subscribe, fetch, destroy } = queryClient.createSubscribe(
      (params: { p1: number; p2: number }) => ({
        x: x(params.p1, params.p2),
        y: y(params.p1),
        z: z(),
      }),
    );

    let rx: number = 0;
    let ry: number = 0;
    let rz: string = '';
    let count: number = 0;

    expect(subscribe).not.toBeUndefined();
    expect(fetch).not.toBeUndefined();

    subscribe({
      next: (p) => {
        rx = p.x.succeed ? p.x.value : 0;
        ry = p.y.succeed ? p.y.value : 0;
        rz = p.z.succeed ? p.z.value : '';
        count += 1;
      },
    });

    fetch({ p1: 1, p2: 2 });

    await delay(null, 200);

    expect(rx).toBe(3);
    expect(ry).toBe(1);
    expect(rz).toBe('hello');
    expect(count).toBe(1);

    fetch();

    await delay(null, 200);

    expect(rx).toBe(3);
    expect(ry).toBe(1);
    expect(rz).toBe('hello');
    expect(count).toBe(2);

    destroy();

    expect(() => {
      fetch();
    }).toThrow();
  });
});
