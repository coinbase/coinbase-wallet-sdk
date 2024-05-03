import { AddressString, IntNumber } from ':core/type';

export interface EthereumTransactionParams {
  fromAddress: AddressString;
  toAddress: AddressString | null;
  weiValue: bigint;
  data: Buffer;
  nonce: IntNumber | null;
  gasPriceInWei: bigint | null;
  maxFeePerGas: bigint | null; // in wei
  maxPriorityFeePerGas: bigint | null; // in wei
  gasLimit: bigint | null;
  chainId: IntNumber;
}
