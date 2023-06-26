import { Subject, Subscription } from "rxjs";

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
import { createQrUrl } from "../util";
import { WalletUI, WalletUIOptions } from "./WalletUI";

export class MobileRelayUI implements WalletUI {
  private readonly version: string;
  private readonly sessionId: string;
  private readonly sessionSecret: string;
  private readonly linkAPIUrl: string;

  private readonly chainId$: Subject<number>;
  private readonly subscriptions = new Subscription();

  private chainId = 1;
  private walletLinkUrl: string | null = null;

  constructor(options: Readonly<WalletUIOptions>) {
    this.version = options.version;
    this.sessionId = options.session.id;
    this.sessionSecret = options.session.secret;
    this.linkAPIUrl = options.linkAPIUrl;
    this.chainId$ = options.chainId$;
  }

  attach() {
    this.createWalletLinkUrl();

    this.subscriptions.add(
      this.chainId$.subscribe(chainId => {
        if (this.chainId !== chainId) {
          this.chainId = chainId;
          this.createWalletLinkUrl();
        }
      }),
    );
  }

  private createWalletLinkUrl() {
    const walletLinkUrl = createQrUrl(
      this.sessionId,
      this.sessionSecret,
      this.linkAPIUrl,
      false,
      this.version,
      this.chainId,
    );

    if (this.walletLinkUrl !== walletLinkUrl) {
      this.walletLinkUrl = walletLinkUrl;
    }
  }

  private openCoinbaseWalletDeeplink(extraParams?: {
    [key: string]: string;
  }): void {
    const url = new URL("https://go.cb-w.com/walletlink");

    const param = {
      redirect_url: window.location.href,
      ...extraParams,
    };
    Object.entries(param).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    window.open(url.href, "_blank");
  }

  requestEthereumAccounts(_options: {
    onCancel: ErrorHandler;
    onAccounts?: ((accounts: [AddressString]) => void) | undefined;
  }): void {
    const wl_url = this.walletLinkUrl;
    if (!wl_url) {
      throw new Error("WalletLinkUrl is not set");
    }

    this.openCoinbaseWalletDeeplink({ wl_url });
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
    this.openCoinbaseWalletDeeplink();
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
    this.openCoinbaseWalletDeeplink();
  }

  selectProvider?(_options: {
    onCancel: ErrorHandler;
    onApprove: (selectedProviderKey: ProviderType) => void;
    providerOptions: ProviderType[];
  }): void {
    this.openCoinbaseWalletDeeplink();
  }

  switchEthereumChain(_options: {
    onCancel: ErrorHandler;
    onApprove: (rpcUrl: string) => void;
    chainId: string;
    address?: string | undefined;
  }): void {
    this.openCoinbaseWalletDeeplink();
  }

  signEthereumMessage(_options: {
    request: SignEthereumMessageRequest;
    onSuccess: (response: SignEthereumMessageResponse) => void;
    onCancel: ErrorHandler;
  }): void {
    this.openCoinbaseWalletDeeplink();
  }

  signEthereumTransaction(_options: {
    request: SignEthereumTransactionRequest;
    onSuccess: (response: SignEthereumTransactionResponse) => void;
    onCancel: ErrorHandler;
  }): void {
    this.openCoinbaseWalletDeeplink();
  }

  submitEthereumTransaction(_options: {
    request: SubmitEthereumTransactionRequest;
    onSuccess: (response: SubmitEthereumTransactionResponse) => void;
    onCancel: ErrorHandler;
  }): void {
    this.openCoinbaseWalletDeeplink();
  }

  ethereumAddressFromSignedMessage(_options: {
    request: EthereumAddressFromSignedMessageRequest;
    onSuccess: (response: EthereumAddressFromSignedMessageResponse) => void;
  }): void {
    this.openCoinbaseWalletDeeplink();
  }

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
