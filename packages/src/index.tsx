import { AtomQuery } from '@atom-query/core';
import { AtomQueryProvider } from '@atom-query/react-query';
import { ErrorCaseBridge } from '__cases__/bridge';
import React from 'react';
import { render } from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';

const atomQuery = new AtomQuery();
const queryClient = new QueryClient();

render(
  <QueryClientProvider client={queryClient}>
    <AtomQueryProvider atomQuery={atomQuery}>
      {/*<IndexerData/>*/}
      <ErrorCaseBridge />
    </AtomQueryProvider>
  </QueryClientProvider>,
  document.querySelector('#app'),
);
