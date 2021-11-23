import { AddressString, IntNumber, RegExpString } from "../types";
import { EthereumTransactionParams } from "./EthereumTransactionParams";
import { Session } from "./Session";
import { Web3Request } from "./Web3Request";
import {
  AddEthereumChainResponse, GenericResponse, EthereumAddressFromSignedMessageResponse, RequestEthereumAccountsResponse, ScanQRCodeResponse, SignEthereumMessageResponse, SignEthereumTransactionResponse,
  SubmitEthereumTransactionResponse, SwitchEthereumChainResponse, Web3Response
} from './Web3Response';

export const WALLET_USER_NAME_KEY = "walletUsername"
export const LOCAL_STORAGE_ADDRESSES_KEY = "Addresses"

export type CancelablePromise<T> = {
  promise: Promise<T>;
  cancel: () => void;
}

export abstract class WalletLinkRelayAbstract {
  abstract resetAndReload(): void
  abstract requestEthereumAccounts(): CancelablePromise<RequestEthereumAccountsResponse>

  abstract addEthereumChain(
    chainId: string,
    blockExplorerUrls?: string[],
    chainName?: string,
    iconUrls?: string[],
    nativeCurrency?: {
      name: string;
      symbol: string;
      decimals: number;
    }
  ): CancelablePromise<AddEthereumChainResponse>

  abstract switchEthereumChain(
    chainId: string,
  ): CancelablePromise<SwitchEthereumChainResponse>

  abstract signEthereumMessage(
    message: Buffer,
    address: AddressString,
    addPrefix: boolean,
    typedDataJson?: string | null
  ): CancelablePromise<SignEthereumMessageResponse>

  abstract ethereumAddressFromSignedMessage(
    message: Buffer,
    signature: Buffer,
    addPrefix: boolean
  ): CancelablePromise<EthereumAddressFromSignedMessageResponse>

  abstract signEthereumTransaction(
    params: EthereumTransactionParams
  ): CancelablePromise<SignEthereumTransactionResponse>

  abstract signAndSubmitEthereumTransaction(
    params: EthereumTransactionParams
  ): CancelablePromise<SubmitEthereumTransactionResponse>

  abstract submitEthereumTransaction(
    signedTransaction: Buffer,
    chainId: IntNumber
  ): CancelablePromise<SubmitEthereumTransactionResponse>

  abstract scanQRCode(regExp: RegExpString): CancelablePromise<ScanQRCodeResponse>
  abstract genericRequest(data: object, action: string): CancelablePromise<GenericResponse>
  abstract sendRequest<T extends Web3Request, U extends Web3Response>(
    request: T
  ): CancelablePromise<U>

  abstract setAppInfo(appName: string, appLogoUrl: string | null): void
  abstract setAccountsCallback(accountsCallback: (accounts: [string]) => void): void
  abstract setChainIdCallback(chainIdCallback: (chainId: string) => void): void
  abstract setJsonRpcUrlCallback(jsonRpcUrlCallback: (jsonRpcUrl: string) => void): void
  abstract get session(): Session
}
