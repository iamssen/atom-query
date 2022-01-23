import { delay, wait } from '__helpers__';
import { query } from '../../atoms/query';
import { FetchWorker, Phase } from '../FetchWorker';

describe('FetchWorker', () => {
  test('should work fetch cycle', async () => {
    let queryCount = 0;

    // Arrange
    const foo = query((p: { a: number; b: number }) => {
      queryCount += 1;
      return delay(p.a + p.b, 500);
    });

    const q = foo({ a: 10, b: 20 });

    // Act / Assert
    const worker = new FetchWorker(q);

    let count = 0;

    worker.add(() => (count += 1));
    worker.add(() => (count += 1));
    worker.add(() => (count += 1));

    expect(worker.phase()).toBe(Phase.FETCHING);

    // callbacks are not executed until the fetch is completed
    expect(count).toBe(0);

    await wait(() => worker.phase() === Phase.CACHED);

    // callbacks were executed when the fetch is completed
    expect(count).toBe(3);

    worker.add(() => (count += 1));

    // when in cache state, callback is executed immediately
    expect(count).toBe(4);

    await wait(() => worker.phase() === Phase.EXPIRED);

    // when in expire state, error occurs
    expect(() => {
      worker.add(() => (count += 1));
    }).toThrow();

    // the actual query is executed only once
    expect(queryCount).toBe(1);
  });
});
