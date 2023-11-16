import BN from 'bn.js';

import { AddressString, IntNumber } from '../../../core/type';

export interface EthereumTransactionParams {
  fromAddress: AddressString;
  toAddress: AddressString | null;
  weiValue: BN;
  data: Buffer;
  nonce: IntNumber | null;
  gasPriceInWei: BN | null;
  maxFeePerGas: BN | null; // in wei
  maxPriorityFeePerGas: BN | null; // in wei
  gasLimit: BN | null;
  chainId: IntNumber;
}
