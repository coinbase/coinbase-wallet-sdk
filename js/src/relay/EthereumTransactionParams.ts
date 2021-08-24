import BN from "bn.js"
import { AddressString, IntNumber } from "../types";

export interface EthereumTransactionParams {
    fromAddress: AddressString
    toAddress: AddressString | null
    weiValue: BN
    data: Buffer
    nonce: IntNumber | null
    maxFeePerGas: BN | null // in wei
    maxPriorityFeePerGas: BN | null // in wei
    gasPriceInWei: BN | null
    gasLimit: BN | null
    chainId: IntNumber
  }