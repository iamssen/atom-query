import { delay } from '__helpers__/delay';
import { compose } from '../compose';
import { query } from '../query';

describe('compose()', () => {
  // Arrange
  const foo = query((p: { a: number; b: number }) => delay(p.a + p.b, 100));
  const bar = query.expand((c: string) => Promise.resolve(c), {
    id: (c) => `custom::${c}`,
  });

  test('should get QueryComposer object', async () => {
    // Arrange
    const c = compose((a: number, b: number) => {
      if (a > 10) {
        return {
          x: foo({ a, b }),
          y: bar(b.toString()),
        };
      }
      return {
        x: 30,
        y: '...',
      };
    });

    // Act
    const { args, fetches, mappers } = c.build(10, 20);

    // Assert
    expect(args.length).toBe(2);
    expect(args).toEqual([10, 20]);
    expect(fetches.length).toBe(1);
    expect(mappers).toBeUndefined();

    // Act
    const values = fetches[0](...args);

    // Assert
    expect(values.x).toBe(30);
    expect(values.y).toBe('...');

    // Act
    const sequence = c.build(100, 20);
    const values2 = sequence.fetches[0](...sequence.args);

    // Assert
    expect(sequence.args).toEqual([100, 20]);
    expect(values2.x.key).toBe(foo.key);
    expect(values2.x.id).toBe('a=100::b=20');
    expect(values2.y.key).toBe(bar.key);
    expect(values2.y.id).toBe('custom::20');
  });

  test('should get MapComposer object', async () => {
    // Arrange
    const c = compose((a: number, b: number) => {
      return {
        x: foo({ a, b }),
        y: bar(b.toString()),
      };
    }).map(({ x, y }) => {
      return `${x}/${y}`;
    });

    // Act
    const { args, fetches, mappers } = c.build(10, 20);

    // Assert
    expect(args).toEqual([10, 20]);
    expect(fetches.length).toBe(1);
    expect(mappers?.length).toBe(1);
    expect(mappers![0]({ x: 1, y: 'a' })).toBe('1/a');
  });
});
