import { query } from '../../atoms/query';
import { fetchQuery } from '../fetchQuery';
import { delay } from '__helpers__';

describe('fetchQuery', () => {
  // Arrange
  const foo = query((p: { a: number; b: number }) => delay(p.a + p.b, 100));
  const bar = query.expand((c: string) => Promise.resolve(c), {
    id: (c) => `custom::${c}`,
  });

  test('should get result', async () => {
    const { x, y, z } = await fetchQuery({
      x: foo({ a: 10, b: 20 }),
      y: bar('hello'),
      z: 45,
    });

    expect(x).toEqual({ success: true, value: 30 });
    expect(y).toEqual({ success: true, value: 'hello' });
    expect(z).toEqual({ success: true, value: 45 });
  });
});
