import { dummyParams } from '../dummyParams';

describe('dummyParams', () => {
  test('should return the same object', () => {
    expect(dummyParams.a.b.c).toBe(dummyParams.x.y.z);
  });
});
