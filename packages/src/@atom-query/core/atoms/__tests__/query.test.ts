import { delay } from '__helpers__';
import { createId, query } from '../query';

describe('query()', () => {
  test('should get Query object', async () => {
    // Arrange
    const q1 = query((p: { a: number; b: number }) => delay(p.a + p.b, 100));
    const q2 = query.expand(
      (p: { a: { v: number } }, m: number) => delay(p.a.v * m, 100),
      { id: (p, m) => `custom-id::${p.a.v}::${m}`, cacheTime: 3000 },
    );

    // Act
    const t1 = q1({ a: 1, b: 2 });
    const t2 = q2({ a: { v: 10 } }, 100);

    // Assert
    expect(t1.key).toBe(q1.key);
    expect(t1.args).toEqual([{ a: 1, b: 2 }]);
    expect(t1.id).toBe(createId({ a: 1, b: 2 }));
    expect(t1.cacheTime).toBe(1000);
    await expect(t1.fetch(...t1.args)).resolves.toBe(3);

    expect(q1.key).not.toBe(q2.key);
    expect(t2.key).toBe(q2.key);
    expect(t2.args).toEqual([{ a: { v: 10 } }, 100]);
    expect(t2.id).toBe('custom-id::10::100');
    expect(t2.cacheTime).toBe(3000);
    await expect(t2.fetch(...t2.args)).resolves.toBe(1000);
  });
});
