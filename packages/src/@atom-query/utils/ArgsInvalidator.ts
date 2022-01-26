import { BehaviorSubject, Observable } from 'rxjs';

export class ArgsInvalidator<T extends unknown[]> {
  #timeoutId: any = 0;
  #latestValue: T | null = null;
  #value: T;
  #subject: BehaviorSubject<T>;
  readonly #delay: number;

  constructor(initialValue: T, delay: number = 1) {
    this.#value = initialValue;
    this.#subject = new BehaviorSubject(initialValue);
    this.#delay = delay;
  }

  updateValue = (nextValue: T) => {
    if (this.#value === nextValue) {
      return;
    }

    this.#value = nextValue;

    if (this.#timeoutId === 0) {
      this.#timeoutId = setTimeout(this.#execute, this.#delay);
    }
  };

  observeInvalidatedValue = (): Observable<T> => {
    return this.#subject.asObservable();
  };

  #execute = () => {
    this.#timeoutId = 0;

    if (
      !this.#latestValue ||
      !shallowArrayEqual(this.#latestValue, this.#value)
    ) {
      this.#subject.next(this.#value);
      this.#latestValue = this.#value;
    }
  };

  destory = () => {
    if (this.#timeoutId !== 0) {
      clearTimeout(this.#timeoutId);
    }

    this.#subject.unsubscribe();
  };
}

function shallowArrayEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let i: number = a.length;
  while (--i >= 0) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}
