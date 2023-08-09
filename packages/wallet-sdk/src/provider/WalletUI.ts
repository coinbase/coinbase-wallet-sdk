import { ErrorHandler } from '../errors';
import { Session } from '../relay/Session';
import {
  EthereumAddressFromSignedMessageRequest,
  SignEthereumMessageRequest,
  SignEthereumTransactionRequest,
  SubmitEthereumTransactionRequest,
} from '../relay/Web3Request';
import {
  EthereumAddressFromSignedMessageResponse,
  SignEthereumMessageResponse,
  SignEthereumTransactionResponse,
  SubmitEthereumTransactionResponse,
} from '../relay/Web3Response';
import { AddressString, ProviderType } from '../types';

export interface WalletUIOptions {
  linkAPIUrl: string;
  version: string;
  darkMode: boolean;
  session: Session;
  connected: boolean;
  chainId: number;
}

export interface WalletUI {
  attach(): void;

  /**
   * Opens a qr code or auth page to connect with Coinbase Wallet mobile app
   * @param options onCancel callback
   *
   */
  requestEthereumAccounts(options: {
    onCancel: ErrorHandler;
    onAccounts?: (accounts: [AddressString]) => void;
  }): void;

  addEthereumChain(options: {
    onCancel: ErrorHandler;
    onApprove: (rpcUrl: string) => void;
    chainId: string;
    rpcUrls: string[];
    blockExplorerUrls?: string[];
    chainName?: string;
    iconUrls?: string[];
    nativeCurrency?: {
      name: string;
      symbol: string;
      decimals: number;
    };
  }): void;

  watchAsset(options: {
    onCancel: ErrorHandler;
    onApprove: () => void;
    type: string;
    address: string;
    symbol?: string;
    decimals?: number;
    image?: string;
    chainId?: string;
  }): void;

  selectProvider?(options: {
    onCancel: ErrorHandler;
    onApprove: (selectedProviderKey: ProviderType) => void;
    providerOptions: ProviderType[];
  }): void;

  switchEthereumChain(options: {
    onCancel: ErrorHandler;
    onApprove: (rpcUrl: string) => void;
    chainId: string;
    address?: string;
  }): void;

  signEthereumMessage(options: {
    request: SignEthereumMessageRequest;
    onSuccess: (response: SignEthereumMessageResponse) => void;
    onCancel: ErrorHandler;
  }): void;

  signEthereumTransaction(options: {
    request: SignEthereumTransactionRequest;
    onSuccess: (response: SignEthereumTransactionResponse) => void;
    onCancel: ErrorHandler;
  }): void;

  submitEthereumTransaction(options: {
    request: SubmitEthereumTransactionRequest;
    onSuccess: (response: SubmitEthereumTransactionResponse) => void;
    onCancel: ErrorHandler;
  }): void;

  ethereumAddressFromSignedMessage(options: {
    request: EthereumAddressFromSignedMessageRequest;
    onSuccess: (response: EthereumAddressFromSignedMessageResponse) => void;
  }): void;

  /**
   * Hide the link flow
   */
  hideRequestEthereumAccounts(): void;

  /**
   *
   * @param options onCancel callback for user clicking cancel,
   *  onResetConnection user clicked reset connection
   *
   * @returns callback that call can call to hide the connecting ui
   */
  showConnecting(options: {
    isUnlinkedErrorState?: boolean;
    onCancel: ErrorHandler;
    onResetConnection: () => void;
  }): () => void;

  /**
   * Reload document ui
   */
  reloadUI(): void;

  /**
   * In some cases, we get the accounts response inline. This means the extension can handle
   * returning the accounts resposne.
   * (i.e. don't need to call a websocket api to get the accounts response)
   */
  inlineAccountsResponse(): boolean;

  /**
   * If the extension is available, it can handle the add ethereum chain request without
   * having to send a request to Coinbase Wallet mobile app
   */
  inlineAddEthereumChain(chainId: string): boolean;

  /**
   * If the extension is available, it can handle the watch asset request without
   * having to send a request to Coinbase Wallet mobile app
   */
  inlineWatchAsset(): boolean;

  /**
   * If the extension is available, it can handle the switch ethereum chain request without
   * having to send a request to Coinbase Wallet mobile app
   */
  inlineSwitchEthereumChain(): boolean;

  /**
   * Set whether the UI is in standalone mode, to preserve context when disconnecting
   */
  setStandalone?(status: boolean): void;

  /**
   * If the extension is in standalone mode, it can handle signing locally
   */
  isStandalone(): boolean;

  /**
   * Set the UI's app src for different apps
   */
  setAppSrc(src: string): void;

  /**
   * We want to disable showing the qr code for in-page connection if the dapp hasn't provided a json rpc url
   */
  setConnectDisabled(_: boolean): void;
}
