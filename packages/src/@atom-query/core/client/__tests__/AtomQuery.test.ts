import {
  PrimitiveParams,
  Query,
  QueryFunction,
  Result,
} from '@atom-query/core/types';
import { delay } from '__helpers__';
import { compose, MapComposer, QueryComposer } from '../../atoms/compose';
import { query } from '../../atoms/query';
import { AtomQuery } from '../AtomQuery';

describe('AtomQuery', () => {
  const foo = query((p: { a: number; b: number }) => delay(p.a + p.b, 100));
  const bar = query((p: { c: string }) => delay(p.c, 100));

  test('should get result from fetch', async () => {
    // Arrange
    const atom = new AtomQuery();

    // Act
    const { x, y, z } = await atom.fetch({
      x: foo({ a: 10, b: 20 }),
      y: bar({ c: 'hello' }),
      z: 45,
    });

    // Assert
    expect(x).toEqual({ success: true, value: 30 });
    expect(y).toEqual({ success: true, value: 'hello' });
    expect(z).toEqual({ success: true, value: 45 });

    expect(atom.fetchCount(foo({ a: 10, b: 20 }))).toBe(1);
    expect(atom.fetchCount(bar({ c: 'hello' }))).toBe(1);
  });

  test('should get result from composer fetch', async () => {
    // Arrange
    const atom = new AtomQuery();
    const com = compose((a: number, b: number, c: string) => {
      return {
        x: foo({ a, b }),
        y: bar({ c }),
        z: 45,
      };
    });

    // Act
    const { x, y, z } = await atom.fetchCompose(com, 10, 20, 'hello');

    // Assert
    expect(x).toEqual({ success: true, value: 30 });
    expect(y).toEqual({ success: true, value: 'hello' });
    expect(z).toEqual({ success: true, value: 45 });

    expect(atom.fetchCount(foo({ a: 10, b: 20 }))).toBe(1);
    expect(atom.fetchCount(bar({ c: 'hello' }))).toBe(1);
  });

  test('should fetch duplicated query only once', async () => {
    // Arrange
    const atom = new AtomQuery();

    // Act
    const values = await Promise.all([
      atom.fetch({ x: foo({ a: 10, b: 20 }), y: foo({ a: 10, b: 20 }) }),
      atom.fetch({ x: foo({ a: 10, b: 20 }), y: foo({ a: 10, b: 20 }) }),
      atom.fetch({ x: foo({ a: 10, b: 20 }), y: foo({ a: 10, b: 20 }) }),
      atom.fetch({ x: foo({ a: 10, b: 20 }), y: foo({ a: 10, b: 20 }) }),
      atom.fetch({ x: foo({ a: 10, b: 20 }), y: foo({ a: 10, b: 20 }) }),
    ]);

    // Assert
    for (const { x, y } of values) {
      expect(x).toEqual({ success: true, value: 30 });
      expect(y).toEqual({ success: true, value: 30 });
    }

    expect(atom.fetchCount(foo({ a: 10, b: 20 }))).toBe(1);
  });

  test('should get result from compser fetch', async () => {
    // Arrange
    const atom = new AtomQuery();

    const c1 = compose((a: number, b: number) => {
      return {
        x: foo({ a, b }),
        y: foo({ a: b, b: a }),
      };
    });

    // Act
    const f1 = atom.createFetch(c1);
    const v1 = await f1(10, 20);

    // Assert
    expect(v1.x).toEqual({ success: true, value: 30 });
    expect(v1.y).toEqual({ success: true, value: 30 });

    // Arrange
    const c2 = c1
      .then(({ x, y }) => {
        if (x.success && y.success) {
          return {
            z: foo({ a: x.value, b: y.value }),
          };
        }

        return { z: 0 };
      })
      .map(({ z }) => {
        return z.success ? z.value : 0;
      })
      .map((z) => {
        return z.toString();
      });

    // Act
    const f2 = atom.createFetch(c2);
    const v2 = await f2(10, 20);

    // Assert
    expect(v2).toBe('60');
  });

  test('should return same the fetch function to the same composer', () => {
    // Arrange
    const atom = new AtomQuery();

    const c1 = compose((a: number, b: number) => {
      return {
        x: foo({ a, b }),
        y: foo({ a: b, b: a }),
      };
    });

    const c2 = compose((a: number, b: number) => {
      return {
        x: foo({ a, b }),
        y: foo({ a: b, b: a }),
      };
    });

    // Act
    const f1 = atom.createFetch(c1);
    const f2 = atom.createFetch(c1);
    const f3 = atom.createFetch(c2);

    // Assert
    expect(f1).toBe(f2);
    expect(f1).not.toBe(f3);
  });

  test('typings', async () => {
    const atom = new AtomQuery();

    const x: QueryFunction<[PrimitiveParams], number> = query(() =>
      delay(10, 10),
    );

    const com1: QueryComposer<[], { x: Query<[PrimitiveParams], number> }> =
      compose(() => {
        return {
          x: x({}),
        };
      });

    const v1 = await atom.fetchCompose(com1);

    const v1x: Result<number> = v1.x;

    expect(v1x).toEqual({ success: true, value: 10 });

    const com2: MapComposer<[], number> = com1.map((v) =>
      v.x.success ? v.x.value : 0,
    );

    const v2: number = await atom.fetchCompose(com2);

    expect(v2).toBe(10);

    const f3 = atom.createFetch(com1);
    const v3 = await f3();
    const v3x: Result<number> = await v3.x;

    expect(v3x).toEqual({ success: true, value: 10 });

    const f4 = atom.createFetch(com2);
    const v4: number = await f4();

    expect(v4).toBe(10);
  });
});
