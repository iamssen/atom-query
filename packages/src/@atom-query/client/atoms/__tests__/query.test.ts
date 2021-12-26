import { query } from '../../atoms/query';

describe('query()', () => {
  test('should create ticket', async () => {
    // Arrange
    const q = query((a: number, b: number) => Promise.resolve(a + b));

    // Act
    const ticket = q(1, 2);

    // Assert
    expect(typeof ticket.key === 'symbol').toBeTruthy();
    expect(ticket.params.args).toEqual([1, 2]);
    expect(ticket.params.serializedArgs).toEqual([1, 2]);
    expect(ticket.params.toString()).toBe(
      `[QueryParams args="1, 2" serializedArgs="1, 2"]`,
    );
    expect(ticket.params.toJSON()).toBe(
      JSON.stringify({ args: [1, 2], serializedArgs: [1, 2] }),
    );
    //@ts-ignore
    await expect(ticket.fetch(...ticket.params.args)).resolves.toBe(3);
  });
});
