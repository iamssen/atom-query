export async function delay<T>(value: T, timeout: number): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(function () {
      resolve(value);
    }, timeout);
  });
}
