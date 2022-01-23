import { delay } from '__helpers__';
import { ValueInvalidator } from '../ValueInvalidator';

describe('ValueInvalidator', () => {
  test('should invalidate values', async () => {
    let latestValue: number = 0;
    let updatedValues: number[] = [];

    const invalidator = new ValueInvalidator<number>(latestValue);
    invalidator.observeInvalidatedValue().subscribe({
      next: (nextValue) => {
        updatedValues.push(nextValue);
        latestValue = nextValue;
      },
    });

    invalidator.updateValue(1);

    expect(latestValue).toBe(0);

    invalidator.updateValue(2);

    expect(latestValue).toBe(0);

    let i: number = 3;
    const max: number = 100;
    while (++i < max) {
      invalidator.updateValue(i);
    }

    await delay(null, 10);

    expect(latestValue).toBe(99);
    expect(updatedValues).toEqual([0, 99]);

    invalidator.destory();
  });
});
