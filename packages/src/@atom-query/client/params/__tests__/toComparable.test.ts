import {
  isEqual,
  ShallowComparableObject,
  toComparable,
} from '../toComparable';
import fastDeepEqual from 'fast-deep-equal';

describe('toComparable()', () => {
  function foo() {}
  const bar = { a: { b: { c: { d: 1 } } } };
  const json = {
    a: 1,
    b: 2,
    toJSON() {
      return JSON.stringify({ a: this.a, b: this.b });
    },
  };
  const set = new Set();

  test('should equal by fast-deep-equal', () => {
    expect(fastDeepEqual(bar, { a: { b: { c: { d: 1 } } } })).toBeTruthy();
  });

  test('should convert to comparable values', () => {
    // Act
    const obj = toComparable(1, true, 'a', foo, bar, json, set);

    // Assert
    expect(
      isEqual(obj, [
        1,
        true,
        'a',
        foo,
        new ShallowComparableObject({ a: { b: { c: { d: 1 } } } }),
        JSON.stringify({ a: 1, b: 2 }),
        set,
      ]),
    ).toBeTruthy();
  });

  test('should trim last undefined values', () => {
    // Act
    const obj = toComparable(
      1,
      true,
      'a',
      foo,
      bar,
      json,
      set,
      undefined,
      undefined,
      undefined,
    );

    // Assert
    expect(obj.length).toBe(7);

    // Assert
    expect(
      isEqual(obj, [
        1,
        true,
        'a',
        foo,
        new ShallowComparableObject({ a: { b: { c: { d: 1 } } } }),
        JSON.stringify({ a: 1, b: 2 }),
        set,
      ]),
    ).toBeTruthy();
  });
});
