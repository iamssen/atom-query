import { isEqual, toComparable } from './toComparable';

export class QueryParams {
  public readonly serializedArgs: unknown[];

  static isEqual = (a: QueryParams, b: QueryParams): boolean => {
    return a.isEqual(b);
  };

  constructor(public readonly key: symbol, public readonly args: unknown[]) {
    this.serializedArgs = toComparable(...args);
  }

  isEqual = (b: QueryParams): boolean => {
    return this.key === b.key && isEqual(this.serializedArgs, b.serializedArgs);
  };

  toString = () => {
    const args = this.args.join(', ');
    const serializedArgs = this.serializedArgs.join(', ');

    return `[QueryParams args="${args}" serializedArgs="${serializedArgs}"]`;
  };

  toJSON = () => {
    return JSON.stringify({
      args: this.args,
      serializedArgs: this.serializedArgs,
    });
  };
}
