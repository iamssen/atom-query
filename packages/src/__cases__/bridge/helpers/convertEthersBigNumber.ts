import BigNumber from 'bignumber.js';
import { BigNumber as EthersBigNumber } from 'ethers';

export function convertEthersBigNumber(
  ethersBigNumber: EthersBigNumber,
  decimals: number,
): BigNumber {
  const bn = new BigNumber(ethersBigNumber.toString());
  return decimals === 6 ? bn : bn.div(Math.pow(10, decimals - 6));
}
