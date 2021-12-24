import { Observable } from 'rxjs';
import { delay } from '../../__helpers__/delay';
import { createLogObserver } from '../../__helpers__/logObserver';

describe('rxjs playground', () => {
  test('is it possible to operate next() after error()?', async () => {
    const ob = new Observable((subscriber) => {
      subscriber.next(1);
      subscriber.error('error');
      subscriber.next(2);
      subscriber.complete();
    });

    const { log, observer } = createLogObserver();

    ob.subscribe(observer);

    await delay(void 0, 10);

    expect(log.map(({ type }) => type).join(',')).toBe('next,error');
  });

  test('is it possible to operate next() after complete()?', async () => {
    const ob = new Observable((subscriber) => {
      subscriber.next(1);
      subscriber.complete();
      subscriber.next(2);
      subscriber.error('error');
    });

    const { log, observer } = createLogObserver();

    ob.subscribe(observer);

    await delay(void 0, 10);

    expect(log.map(({ type }) => type).join(',')).toBe('next,complete');
  });
});
