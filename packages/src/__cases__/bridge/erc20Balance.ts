import { query } from '@atom-query/core';
import { BigNumber as EthersBigNumber } from '@ethersproject/bignumber';
import { Provider } from '@ethersproject/providers';
import { Contract, Signer } from 'ethers';
import { ERC20Interface } from './abi';
import { convertEthersBigNumber } from './helpers/convertEthersBigNumber';

/**
 * @see https://docs.ethers.io/v5/api/contract/example/#erc20-meta-methods
 * @see https://ethereum.stackexchange.com/questions/101858/how-to-get-the-erc-20-token-balance-of-an-account-using-etherjs
 */
export const erc20Balance = query.expand(
  async (
    account: string,
    tokenAddress: string,
    signerOrProvider: Signer | Provider,
  ) => {
    console.log('erc20Balance.ts..() !!!');
    const contract = new Contract(
      tokenAddress,
      ERC20Interface,
      signerOrProvider,
    );
    console.log('erc20Balance.ts..()', contract);

    const [decimals, balance]: [number, EthersBigNumber] = await Promise.all([
      contract.decimals(),
      contract.balanceOf(account),
    ]);

    return convertEthersBigNumber(balance, decimals);
  },
  {
    id: (account, tokenAddress) => account + '::' + tokenAddress,
  },
);
