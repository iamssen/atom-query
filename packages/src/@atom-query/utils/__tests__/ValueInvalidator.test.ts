import { delay } from '__helpers__';
import { ArgsInvalidator } from '../ArgsInvalidator';

describe('ArgsInvalidator', () => {
  test('should invalidate args', async () => {
    let latestValue: number[] = [0];
    let updatedValues: number[][] = [];

    const invalidator = new ArgsInvalidator<number[]>(latestValue);
    invalidator.observeInvalidatedValue().subscribe({
      next: (nextValue) => {
        updatedValues.push(nextValue);
        latestValue = nextValue;
      },
    });

    invalidator.updateValue([1]);

    expect(latestValue).toEqual([0]);

    invalidator.updateValue([2]);

    expect(latestValue).toEqual([0]);

    let i: number = 3;
    const max: number = 100;
    while (++i < max) {
      invalidator.updateValue([i]);
    }

    await delay(null, 10);

    expect(latestValue).toEqual([99]);
    expect(updatedValues).toEqual([[0], [99]]);

    invalidator.destory();
  });
});
