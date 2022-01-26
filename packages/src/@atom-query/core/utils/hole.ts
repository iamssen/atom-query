import { v4 } from 'uuid';

function uuid(): string {
  const id = v4();
  return '__hole__::' + id;
}

export function isUUID(obj: any): boolean {
  return typeof obj === 'string' && obj.indexOf('__hole__::') === 0;
}

export class Hole {
  #blackStore = new Map<string, any>();
  #whiteStore = new Map<any, string>();

  push = <T>(obj: T): T => {
    if (typeof obj !== 'object') {
      return obj;
    }

    if (this.#whiteStore.has(obj)) {
      const id = this.#whiteStore.get(obj)!;
      return id as any;
    } else {
      const id = uuid();
      this.#blackStore.set(id, obj);
      this.#whiteStore.set(obj, id);
      return id as any;
    }
  };

  pop = <T>(id: T): T => {
    if (typeof id !== 'string') {
      return id;
    }
    const obj: T = this.#blackStore.get(id as any);
    //blackStore.delete(id as any);
    //whiteStore.delete(obj);
    return obj;
  };

  clear = () => {
    this.#blackStore.clear();
    this.#whiteStore.clear();
  };
}
