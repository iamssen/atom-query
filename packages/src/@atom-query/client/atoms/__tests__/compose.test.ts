import { compose } from '../../atoms/compose';
import { query } from '../../atoms/query';

describe('compose()', () => {
  const foo = query((a: number, b: number) => Promise.resolve(a + b));
  const bar = query((c: string) => Promise.resolve(c));

  test('should create queries', async () => {
    // Arrange
    const c = compose((p: { a: number; b: number }) => ({
      x: foo(p.a, p.b),
      y: bar(p.a.toString()),
    }));

    // Act
    const r = c.create()({ a: 1, b: 2 });

    if ('result' in r) {
      throw new Error(`result is not a ComposedQueryResult!`);
    }

    // Assert
    expect(r.queries['x'].params.key).toBe(r.queries['x'].key);
    expect(r.queries['x'].params.args).toEqual([1, 2]);
    expect(r.queries['y'].params.key).toBe(r.queries['y'].key);
    expect(r.queries['y'].params.args).toEqual(['1']);
    expect(r.map).toBeUndefined();
    await expect(
      r.queries['x'].fetch(...r.queries['x'].params.args),
    ).resolves.toBe(3);
    await expect(
      r.queries['y'].fetch(...r.queries['y'].params.args),
    ).resolves.toBe('1');
  });

  test('should create map', async () => {
    // Arrange
    const c = compose((p: { a: number; b: number }) => ({
      x: foo(p.a, p.b),
      y: bar(p.a.toString()),
    }))
      .map(({ x, y }) => JSON.stringify({ x, y }))
      .map((json) => `json: ${json}`);

    // Act
    const r = c.create()({ a: 1, b: 2 });

    if ('result' in r) {
      throw new Error(`result is not a ComposedQueryResult!`);
    }

    // Assert
    expect(r.queries['x'].params.key).toBe(r.queries['x'].key);
    expect(r.queries['x'].params.args).toEqual([1, 2]);
    expect(r.queries['y'].params.key).toBe(r.queries['y'].key);
    expect(r.queries['y'].params.args).toEqual(['1']);
    expect(r.map).not.toBeUndefined();
    await expect(
      Promise.all([
        r.queries['x'].fetch(...r.queries['x'].params.args),
        r.queries['y'].fetch(...r.queries['y'].params.args),
      ]).then(([x, y]) => r.map?.({ x, y })),
    ).resolves.toBe('json: ' + JSON.stringify({ x: 3, y: '1' }));
  });

  test('should succeed intercept', async () => {
    // Arrange
    const c = compose((p: { a: number; b: number }) => ({
      x: foo(p.a, p.b),
      y: bar(p.a.toString()),
    }))
      .map(({ x, y }) => {
        return x.succeed && y.succeed ? `${x.value}:${y.value}` : '';
      })
      .intercept((p2: { c: number }, next, intercept: (v: boolean) => void) => {
        if (p2.c > 10) {
          next({ a: 10, b: 20 });
        } else {
          intercept(true);
        }
      });

    // Act
    const r1 = c.create()({ c: 0 });
    const r2 = c.create()({ c: 100 });

    // Assert
    expect('result' in r1 && r1.result).toBeTruthy();
    expect('queries' in r2 && r2.queries['x'].params.key).toBe(foo.key);
  });
});
