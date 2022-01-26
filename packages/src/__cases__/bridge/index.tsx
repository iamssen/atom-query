import { compose, Hole } from '@atom-query/core';
import { useAtomQuery } from '@atom-query/react-query';
import { BscscanProvider } from '@ethers-ancillary/bsc';
import { Provider, Web3Provider } from '@ethersproject/providers';
import { erc20Balance } from '__cases__/bridge/erc20Balance';
import BigNumber from 'bignumber.js';
import { Signer } from 'ethers';
import React, { useEffect, useMemo } from 'react';

const hole = new Hole();

const balance = compose(
  (
    tokenAddress: string,
    account: string | null,
    _signerOrProvider?: Signer | Provider | null | undefined,
  ) => {
    const signerOrProvider = hole.pop(_signerOrProvider);

    if (!account || !signerOrProvider) {
      return {
        lunaBalance: new BigNumber(0),
      };
    }

    return {
      lunaBalance: erc20Balance(account, tokenAddress, signerOrProvider),
    };
  },
);

//eslint-disable-next-line @typescript-eslint/no-unused-vars
const bscProvider = new BscscanProvider('bsc-testnet');

export function ErrorCaseBridge() {
  const provider = useMemo(() => {
    //@ts-ignore
    return new Web3Provider(window.ethereum);
  }, []);

  const { data } = useAtomQuery('balance', balance, [
    '0x7B8eAe1E85c8b189eE653d3f78733F4f788bb2c1',
    '0x4180fb85d446bf4d856928248fe2aa4f6339459a',
    //bscProvider,
    hole.push(provider),
    //connectedProvider?.provider as any,
    //web3Provider,
  ]);

  useEffect(() => {
    hole.clear();
  }, []);

  return <pre>{JSON.stringify(data)}</pre>;
}
