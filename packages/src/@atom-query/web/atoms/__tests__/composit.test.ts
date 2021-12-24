import { composit } from '../../atoms/composit';
import { query } from '../../atoms/query';

describe('composit()', () => {
  test('should create queries', async () => {
    const foo = query((a: number, b: number) => Promise.resolve(a + b));
    const bar = query((c: string) => Promise.resolve(c));

    const c = composit((p: { a: number; b: number }) => ({
      x: foo(p.a, p.b),
      y: bar(p.a.toString()),
    }));

    const { queries, map } = c.create()({ a: 1, b: 2 });

    expect(queries['x'].params.key).toBe(queries['x'].key);
    expect(queries['x'].params.args).toEqual([1, 2]);
    expect(queries['y'].params.key).toBe(queries['y'].key);
    expect(queries['y'].params.args).toEqual(['1']);
    expect(map).toBeUndefined();
    await expect(queries['x'].fetch(...queries['x'].params.args)).resolves.toBe(
      3,
    );
    await expect(queries['y'].fetch(...queries['y'].params.args)).resolves.toBe(
      '1',
    );
  });

  test('should create map', async () => {
    const foo = query((a: number, b: number) => Promise.resolve(a + b));
    const bar = query((c: string) => Promise.resolve(c));

    const c = composit((p: { a: number; b: number }) => ({
      x: foo(p.a, p.b),
      y: bar(p.a.toString()),
    }))
      .map(({ x, y }) => JSON.stringify({ x, y }))
      .map((json) => `json: ${json}`);

    const { queries, map } = c.create()({ a: 1, b: 2 });

    expect(queries['x'].params.key).toBe(queries['x'].key);
    expect(queries['x'].params.args).toEqual([1, 2]);
    expect(queries['y'].params.key).toBe(queries['y'].key);
    expect(queries['y'].params.args).toEqual(['1']);
    expect(map).not.toBeUndefined();
    await expect(
      Promise.all([
        queries['x'].fetch(...queries['x'].params.args),
        queries['y'].fetch(...queries['y'].params.args),
      ]).then(([x, y]) => map?.({ x, y })),
    ).resolves.toBe('json: ' + JSON.stringify({ x: 3, y: '1' }));
  });
});
