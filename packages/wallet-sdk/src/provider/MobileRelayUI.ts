import { ErrorHandler } from "../errors";
import {
  EthereumAddressFromSignedMessageRequest,
  SignEthereumMessageRequest,
  SignEthereumTransactionRequest,
  SubmitEthereumTransactionRequest,
} from "../relay/Web3Request";
import {
  EthereumAddressFromSignedMessageResponse,
  SignEthereumMessageResponse,
  SignEthereumTransactionResponse,
  SubmitEthereumTransactionResponse,
} from "../relay/Web3Response";
import { AddressString, ProviderType } from "../types";
import { WalletUI } from "./WalletUI";

export class MobileRelayUI implements WalletUI {
  attach(): void {
    throw new Error("Method not implemented.");
  }
  requestEthereumAccounts(_options: {
    onCancel: ErrorHandler;
    onAccounts?: ((accounts: [AddressString]) => void) | undefined;
  }): void {
    throw new Error("Method not implemented.");
  }
  addEthereumChain(_options: {
    onCancel: ErrorHandler;
    onApprove: (rpcUrl: string) => void;
    chainId: string;
    rpcUrls: string[];
    blockExplorerUrls?: string[] | undefined;
    chainName?: string | undefined;
    iconUrls?: string[] | undefined;
    nativeCurrency?:
      | { name: string; symbol: string; decimals: number }
      | undefined;
  }): void {
    throw new Error("Method not implemented.");
  }
  watchAsset(_options: {
    onCancel: ErrorHandler;
    onApprove: () => void;
    type: string;
    address: string;
    symbol?: string | undefined;
    decimals?: number | undefined;
    image?: string | undefined;
    chainId?: string | undefined;
  }): void {
    throw new Error("Method not implemented.");
  }
  selectProvider?(_options: {
    onCancel: ErrorHandler;
    onApprove: (selectedProviderKey: ProviderType) => void;
    providerOptions: ProviderType[];
  }): void {
    throw new Error("Method not implemented.");
  }
  switchEthereumChain(_options: {
    onCancel: ErrorHandler;
    onApprove: (rpcUrl: string) => void;
    chainId: string;
    address?: string | undefined;
  }): void {
    throw new Error("Method not implemented.");
  }
  signEthereumMessage(_options: {
    request: SignEthereumMessageRequest;
    onSuccess: (response: SignEthereumMessageResponse) => void;
    onCancel: ErrorHandler;
  }): void {
    throw new Error("Method not implemented.");
  }
  signEthereumTransaction(_options: {
    request: SignEthereumTransactionRequest;
    onSuccess: (response: SignEthereumTransactionResponse) => void;
    onCancel: ErrorHandler;
  }): void {
    throw new Error("Method not implemented.");
  }
  submitEthereumTransaction(_options: {
    request: SubmitEthereumTransactionRequest;
    onSuccess: (response: SubmitEthereumTransactionResponse) => void;
    onCancel: ErrorHandler;
  }): void {
    throw new Error("Method not implemented.");
  }
  ethereumAddressFromSignedMessage(_options: {
    request: EthereumAddressFromSignedMessageRequest;
    onSuccess: (response: EthereumAddressFromSignedMessageResponse) => void;
  }): void {
    throw new Error("Method not implemented.");
  }
  hideRequestEthereumAccounts(): void {
    throw new Error("Method not implemented.");
  }
  showConnecting(_options: {
    isUnlinkedErrorState?: boolean | undefined;
    onCancel: ErrorHandler;
    onResetConnection: () => void;
  }): () => void {
    throw new Error("Method not implemented.");
  }
  reloadUI(): void {
    throw new Error("Method not implemented.");
  }
  inlineAccountsResponse(): boolean {
    throw new Error("Method not implemented.");
  }
  inlineAddEthereumChain(_chainId: string): boolean {
    throw new Error("Method not implemented.");
  }
  inlineWatchAsset(): boolean {
    throw new Error("Method not implemented.");
  }
  inlineSwitchEthereumChain(): boolean {
    throw new Error("Method not implemented.");
  }
  setStandalone?(_status: boolean): void {
    throw new Error("Method not implemented.");
  }
  isStandalone(): boolean {
    throw new Error("Method not implemented.");
  }
  setAppSrc(_src: string): void {
    throw new Error("Method not implemented.");
  }
  setConnectDisabled(_: boolean): void {
    throw new Error("Method not implemented.");
  }
}
