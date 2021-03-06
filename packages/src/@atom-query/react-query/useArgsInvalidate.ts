import { ArgsInvalidator } from '@atom-query/utils';
import { useEffect, useState } from 'react';

export function useArgsInvalidate<T extends unknown[]>(
  nextValue: T,
  delay: number = 1,
): T {
  const [value, setValue] = useState<T>(nextValue);

  const [invalidator] = useState(() => {
    return new ArgsInvalidator(nextValue, delay);
  });

  useEffect(() => {
    invalidator.updateValue(nextValue);
  }, [invalidator, nextValue]);

  useEffect(() => {
    const subscription = invalidator.observeInvalidatedValue().subscribe({
      next: setValue,
    });

    return () => {
      subscription.unsubscribe();
      invalidator.destory();
    };
  }, [invalidator]);

  return value;
}
