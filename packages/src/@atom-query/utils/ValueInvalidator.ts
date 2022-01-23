import { BehaviorSubject, Observable } from 'rxjs';

export class ValueInvalidator<T> {
  #timeoutId: any = 0;
  #value: T;
  #subject: BehaviorSubject<T>;
  #delay: number;

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
    this.#subject.next(this.#value);
  };

  destory = () => {
    if (this.#timeoutId !== 0) {
      clearTimeout(this.#timeoutId);
    }

    this.#subject.unsubscribe();
  };
}
