export const dummyParams: any = new Proxy(
  {},
  {
    get: () => {
      return dummyParams;
    },
  },
);
