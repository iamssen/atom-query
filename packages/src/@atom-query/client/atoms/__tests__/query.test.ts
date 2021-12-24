import { query } from '../../atoms/query';

describe('query()', () => {
  test('should create job', async () => {
    // Arrange
    const q = query((a: number, b: number) => Promise.resolve(a + b));

    // Act
    const job = q(1, 2);

    // Assert
    expect(typeof job.key === 'symbol').toBeTruthy();
    expect(job.params.args).toEqual([1, 2]);
    expect(job.params.serializedArgs).toEqual([1, 2]);
    expect(job.params.toString()).toBe(
      `[QueryParams args="1, 2" serializedArgs="1, 2"]`,
    );
    expect(job.params.toJSON()).toBe(
      JSON.stringify({ args: [1, 2], serializedArgs: [1, 2] }),
    );
    //@ts-ignore
    await expect(job.fetch(...job.params.args)).resolves.toBe(3);
  });
});
