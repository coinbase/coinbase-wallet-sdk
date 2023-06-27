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
import { WalletUI, WalletUIOptions } from "./WalletUI";

// TODO: Implement & present in-page wallet picker instead of navigating to www.coinbase.com/connect-dapp
export class MobileRelayUI implements WalletUI {
  constructor(_options: Readonly<WalletUIOptions>) {}

  attach() {} // no-op

  requestEthereumAccounts(_options: {
    onCancel: ErrorHandler;
    onAccounts?: ((accounts: [AddressString]) => void) | undefined;
  }): void {} // no-op

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
  }): void {} // no-op

  watchAsset(_options: {
    onCancel: ErrorHandler;
    onApprove: () => void;
    type: string;
    address: string;
    symbol?: string | undefined;
    decimals?: number | undefined;
    image?: string | undefined;
    chainId?: string | undefined;
  }): void {} // no-op

  selectProvider?(_options: {
    onCancel: ErrorHandler;
    onApprove: (selectedProviderKey: ProviderType) => void;
    providerOptions: ProviderType[];
  }): void {} // no-op

  switchEthereumChain(_options: {
    onCancel: ErrorHandler;
    onApprove: (rpcUrl: string) => void;
    chainId: string;
    address?: string | undefined;
  }): void {} // no-op

  signEthereumMessage(_options: {
    request: SignEthereumMessageRequest;
    onSuccess: (response: SignEthereumMessageResponse) => void;
    onCancel: ErrorHandler;
  }): void {} // no-op

  signEthereumTransaction(_options: {
    request: SignEthereumTransactionRequest;
    onSuccess: (response: SignEthereumTransactionResponse) => void;
    onCancel: ErrorHandler;
  }): void {} // no-op

  submitEthereumTransaction(_options: {
    request: SubmitEthereumTransactionRequest;
    onSuccess: (response: SubmitEthereumTransactionResponse) => void;
    onCancel: ErrorHandler;
  }): void {} // no-op

  ethereumAddressFromSignedMessage(_options: {
    request: EthereumAddressFromSignedMessageRequest;
    onSuccess: (response: EthereumAddressFromSignedMessageResponse) => void;
  }): void {} // no-op

  reloadUI() {} // no-op

  hideRequestEthereumAccounts() {} // no-op

  setStandalone?(_status: boolean) {} // no-op

  setAppSrc(_src: string) {} // no-op

  setConnectDisabled(_: boolean) {} // no-op

  showConnecting(_options: {
    isUnlinkedErrorState?: boolean | undefined;
    onCancel: ErrorHandler;
    onResetConnection: () => void;
  }): () => void {
    return () => {}; // no-op
  }

  inlineAccountsResponse(): boolean {
    return false;
  }

  inlineAddEthereumChain(_chainId: string): boolean {
    return false;
  }

  inlineWatchAsset(): boolean {
    return false;
  }

  inlineSwitchEthereumChain(): boolean {
    return false;
  }

  isStandalone(): boolean {
    return false;
  }
}
