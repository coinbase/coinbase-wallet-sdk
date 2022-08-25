import { ethErrors, serializeError } from "eth-rpc-errors";

import { JSONRPCRequest, JSONRPCResponse } from "../provider/JSONRPC";
import { AddressString, IntNumber, ProviderType, RegExpString } from "../types";
import { EthereumTransactionParams } from "./EthereumTransactionParams";
import { Session } from "./Session";
import { Web3Request } from "./Web3Request";
import {
  AddEthereumChainResponse,
  EthereumAddressFromSignedMessageResponse,
  GenericResponse,
  RequestEthereumAccountsResponse,
  ScanQRCodeResponse,
  SelectProviderResponse,
  SignEthereumMessageResponse,
  SignEthereumTransactionResponse,
  SubmitEthereumTransactionResponse,
  SwitchEthereumChainResponse,
  WatchAssetResponse,
  Web3Response,
} from "./Web3Response";

export const WALLET_USER_NAME_KEY = "walletUsername";
export const LOCAL_STORAGE_ADDRESSES_KEY = "Addresses";
export const APP_VERSION_KEY = "AppVersion";

export type CancelablePromise<T> = {
  promise: Promise<T>;
  cancel: (error?: Error) => void;
};

export abstract class WalletSDKRelayAbstract {
  abstract resetAndReload(): void;

  abstract requestEthereumAccounts(): CancelablePromise<RequestEthereumAccountsResponse>;

  abstract addEthereumChain(
    chainId: string,
    rpcUrls: string[],
    iconUrls: string[],
    blockExplorerUrls: string[],
    chainName: string,
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    },
  ): CancelablePromise<AddEthereumChainResponse>;

  abstract watchAsset(
    type: string,
    address: string,
    symbol?: string,
    decimals?: number,
    image?: string,
    chainId?: string,
  ): CancelablePromise<WatchAssetResponse>;

  abstract selectProvider(
    providerOptions: ProviderType[],
  ): CancelablePromise<SelectProviderResponse>;

  abstract switchEthereumChain(
    chainId: string,
    address?: string,
  ): CancelablePromise<SwitchEthereumChainResponse>;

  abstract signEthereumMessage(
    message: Buffer,
    address: AddressString,
    addPrefix: boolean,
    typedDataJson?: string | null,
  ): CancelablePromise<SignEthereumMessageResponse>;

  abstract ethereumAddressFromSignedMessage(
    message: Buffer,
    signature: Buffer,
    addPrefix: boolean,
  ): CancelablePromise<EthereumAddressFromSignedMessageResponse>;

  abstract signEthereumTransaction(
    params: EthereumTransactionParams,
  ): CancelablePromise<SignEthereumTransactionResponse>;

  abstract signAndSubmitEthereumTransaction(
    params: EthereumTransactionParams,
  ): CancelablePromise<SubmitEthereumTransactionResponse>;

  abstract submitEthereumTransaction(
    signedTransaction: Buffer,
    chainId: IntNumber,
  ): CancelablePromise<SubmitEthereumTransactionResponse>;

  abstract scanQRCode(
    regExp: RegExpString,
  ): CancelablePromise<ScanQRCodeResponse>;

  abstract genericRequest(
    data: object,
    action: string,
  ): CancelablePromise<GenericResponse>;

  abstract sendRequest<T extends Web3Request, U extends Web3Response>(
    request: T,
  ): CancelablePromise<U>;

  abstract setAppInfo(appName: string, appLogoUrl: string | null): void;

  abstract setAccountsCallback(
    accountsCallback: (accounts: string[], isDisconnect?: boolean) => void,
  ): void;

  abstract setChainCallback(
    chainIdCallback: (chainId: string, jsonRpcUrl: string) => void,
  ): void;

  abstract setDappDefaultChainCallback(chainId: number): void;

  /**
   * Whether the relay supports the add ethereum chain call without
   * needing to be connected to the mobile client.
   */
  abstract inlineAddEthereumChain(chainId: string): boolean;

  public async makeEthereumJSONRPCRequest(
    request: JSONRPCRequest,
    jsonRpcUrl: string,
  ): Promise<JSONRPCResponse | void> {
    if (!jsonRpcUrl) throw new Error("Error: No jsonRpcUrl provided");
    return window
      .fetch(jsonRpcUrl, {
        method: "POST",
        body: JSON.stringify(request),
        mode: "cors",
        headers: { "Content-Type": "application/json" },
      })
      .then(res => res.json())
      .then(json => {
        if (!json) {
          throw ethErrors.rpc.parse({});
        }
        const response = json as JSONRPCResponse;
        const { error } = response;
        if (error) {
          throw serializeError(error);
        }
        return response;
      });
  }

  abstract get session(): Session;
}
