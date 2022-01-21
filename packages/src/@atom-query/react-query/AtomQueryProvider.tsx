import { AtomQuery, Composer } from '@atom-query/core';
import React, {
  Context,
  createContext,
  ReactNode,
  useContext,
  useMemo,
} from 'react';

export interface AtomQueryProviderProps {
  atomQuery: AtomQuery;
  children: ReactNode;
}

// @ts-ignore
const AtomQueryContext: Context<AtomQuery> = createContext<AtomQuery>();

export function AtomQueryProvider({
  children,
  atomQuery,
}: AtomQueryProviderProps) {
  return (
    <AtomQueryContext.Provider value={atomQuery}>
      {children}
    </AtomQueryContext.Provider>
  );
}

export function useAtomQueryFetch<Args extends unknown[], R>(
  composer: Composer<Args, R>,
) {
  const atomQuery = useContext(AtomQueryContext);

  return useMemo(() => {
    return atomQuery.createFetch(composer);
  }, [atomQuery, composer]);
}
