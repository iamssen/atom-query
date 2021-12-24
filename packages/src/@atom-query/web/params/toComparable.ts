export class ShallowComparableArray {
  constructor(private arr: unknown[]) {}

  isEqual = (b: unknown) => {
    if (b instanceof ShallowComparableArray) {
      let i: number = this.arr.length;
      while (--i >= 0) {
        if (this.arr[i] !== b.arr[i]) {
          return false;
        }
      }

      return true;
    }

    return false;
  };
}

export class ShallowComparableObject {
  private readonly keys: string[];

  constructor(private obj: object) {
    this.keys = Object.keys(obj);
  }

  isEqual = (b: unknown) => {
    if (b instanceof ShallowComparableObject) {
      if (this.obj === b.obj) {
        return true;
      } else if (this.keys.length !== b.keys.length) {
        return false;
      }

      for (const key of this.keys) {
        //@ts-ignore
        if (this.obj[key] !== b.obj[key]) {
          return false;
        }
      }

      return true;
    }

    return false;
  };
}

export function findLastExistsIndex(arr: any[]): number {
  let i: number = arr.length;
  while (--i >= 0) {
    if (arr[i] !== undefined) {
      return i + 1;
    }
  }
  return -1;
}

export function toComparable(...args: any[]): any[] {
  const trimedArgs = args.slice(0, findLastExistsIndex(args));

  return trimedArgs.map((arg) => {
    const type = typeof arg;

    if (type !== 'object') {
      return arg;
    } else if ('toJSON' in arg) {
      return arg.toJSON();
    } else if (Array.isArray(arg)) {
      return new ShallowComparableArray(arg);
    } else if (arg.toString() === '[object Object]') {
      return new ShallowComparableObject(arg);
    } else {
      return arg.valueOf();
    }
  });
}

function is(a: unknown, b: unknown): boolean {
  if (
    a instanceof ShallowComparableArray &&
    b instanceof ShallowComparableArray
  ) {
    return a.isEqual(b);
  } else if (
    a instanceof ShallowComparableObject &&
    b instanceof ShallowComparableObject
  ) {
    return a.isEqual(b);
  }
  return a === b;
}

export function isEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let i: number = a.length;
  while (--i >= 0) {
    if (!is(a[i], b[i])) {
      return false;
    }
  }

  return true;
}
