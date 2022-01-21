import { AtomQuery, compose, query } from '@atom-query/core';
import { AtomQueryProvider, useAtomQuery } from '@atom-query/react-query';
import React from 'react';
import { render } from 'react-dom';
import JsonView, { ReactJsonViewProps } from 'react-json-view';
import { QueryClient, QueryClientProvider } from 'react-query';

const anc = query(
  () =>
    fetch('https://api.anchorprotocol.com/api/v1/anc/1d').then((res) =>
      res.json(),
    ),
  { cacheTime: 1000 * 60 * 5 },
);

const deposit = query(() =>
  fetch('https://api.anchorprotocol.com/api/v1/deposit/1d').then((res) =>
    res.json(),
  ),
);

const collaterals = query(() =>
  fetch('https://api.anchorprotocol.com/api/v1/deposit/1d').then((res) =>
    res.json(),
  ),
);

const indexerData = compose(() => {
  return {
    anc: anc({}),
    deposit: deposit({}),
    collaterals: collaterals({}),
  };
});

const jsonViewOptions: Omit<ReactJsonViewProps, 'src'> = {
  iconStyle: 'triangle',
  theme: 'monokai',
  displayDataTypes: false,
  enableClipboard: false,
  collapseStringsAfterLength: 50,
  collapsed: 3,
};

function App() {
  const { data } = useAtomQuery('indexer_data', indexerData, []);

  return (
    <div>
      <h1>Indexer data</h1>
      {data && <JsonView src={data} {...jsonViewOptions} />}
    </div>
  );
}

const atomQuery = new AtomQuery();
const queryClient = new QueryClient();

render(
  <QueryClientProvider client={queryClient}>
    <AtomQueryProvider atomQuery={atomQuery}>
      <App />
    </AtomQueryProvider>
  </QueryClientProvider>,
  document.querySelector('#app'),
);
