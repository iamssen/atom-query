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

  //test('unify test', () => {
  //  const queryClient = new QueryClient();
  //
  //  const { observe, fetch, refetch, destroy } = queryClient.unify(
  //    (params: { p1: number; p2: number }) => ({
  //      a: x(params.p1, params.p2),
  //      b: y(params.p1),
  //      c: z(),
  //    }),
  //  );
  //
  //  const subscription = observe().subscribe({
  //    next: ({a, b, c}) => {
  //
  //    }
  //  })
  //
  //  fetch({p1: 3, p2: 4}).then(({a, b, c}) => {
  //
  //  })
  //
  //  refetch('a', 'c')
  //});
});
