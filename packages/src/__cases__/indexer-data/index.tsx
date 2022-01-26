import { AtomQuery, compose, query } from '@atom-query/core';
import { useAtomQuery } from '@atom-query/react-query';
import React from 'react';
import JsonView, { ReactJsonViewProps } from 'react-json-view';

const anc = query(
  () =>
    fetch('https://api.anchorprotocol.com/api/v1/anc/1d').then(
      (res) => res.json() as Promise<any[]>,
    ),
  { cacheTime: 1000 * 60 * 5 },
);

const deposit = query(() =>
  fetch('https://api.anchorprotocol.com/api/v1/deposit/1d').then(
    (res) => res.json() as Promise<{ total_ust_deposits: any[] }>,
  ),
);

const collaterals = query(() =>
  fetch('https://api.anchorprotocol.com/api/v1/deposit/1d').then(
    (res) => res.json() as Promise<{ total_ust_deposits: any[] }>,
  ),
);

const indexerData = compose(() => {
  return {
    anc: anc({}),
    deposit: deposit({}),
    collaterals: collaterals({}),
  };
});

const indexerDataCounts = compose(() => {
  return {
    anc: anc({}),
    deposit: deposit({}),
    collaterals: collaterals({}),
  };
}).map((r) => {
  return {
    anc: r.anc.success ? (r.anc.value.length as number) : 0,
    deposit: r.deposit.success
      ? (r.deposit.value.total_ust_deposits.length as number)
      : 0,
    collaterals: r.collaterals.success
      ? (r.collaterals.value.total_ust_deposits.length as number)
      : 0,
  };
});

const atom = new AtomQuery();
const x = atom.createFetch(indexerData);
const y = atom.createFetch(indexerDataCounts);
x().then((r) => console.log(r.anc));
y().then((r) => console.log(r.anc));

const jsonViewOptions: Omit<ReactJsonViewProps, 'src'> = {
  iconStyle: 'triangle',
  theme: 'monokai',
  displayDataTypes: false,
  enableClipboard: false,
  collapseStringsAfterLength: 50,
  collapsed: 3,
};

export function IndexerData() {
  const { data: indexerDataResult } = useAtomQuery(
    'indexer_data',
    indexerData,
    [],
  );

  const { data: indexerDataCountsResult } = useAtomQuery(
    'indexer_data_count',
    indexerDataCounts,
    [],
  );

  console.log(indexerDataResult?.anc, indexerDataCountsResult?.anc);

  return (
    <div>
      <h1>Indexer data ({JSON.stringify(indexerDataCountsResult)})</h1>
      {indexerDataResult && (
        <JsonView src={indexerDataResult} {...jsonViewOptions} />
      )}
    </div>
  );
}
