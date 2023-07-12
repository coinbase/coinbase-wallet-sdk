import { LinkFlow } from '../components/LinkFlow/LinkFlow';
import { Snackbar, SnackbarInstanceProps } from '../components/Snackbar/Snackbar';
import { ErrorHandler } from '../errors';
import { injectCssReset } from '../lib/cssReset';
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
import { WalletUI, WalletUIOptions } from './WalletUI';

export class WalletLinkRelayUI implements WalletUI {
  private readonly linkFlow: LinkFlow;
  private readonly snackbar: Snackbar;
  private standalone: boolean | null = null;
  private attached = false;
  private appSrc: string | null = null;

  constructor(options: Readonly<WalletUIOptions>) {
    this.snackbar = new Snackbar({
      darkMode: options.darkMode,
    });

    this.linkFlow = new LinkFlow({
      darkMode: options.darkMode,
      version: options.version,
      sessionId: options.session.id,
      sessionSecret: options.session.secret,
      linkAPIUrl: options.linkAPIUrl,
      connected$: options.connected$,
      chainId$: options.chainId$,
      isParentConnection: false,
    });
  }

  attach(): void {
    if (this.attached) {
      throw new Error('Coinbase Wallet SDK UI is already attached');
    }
    const el = document.documentElement;
    const container = document.createElement('div');
    container.className = '-cbwsdk-css-reset';
    el.appendChild(container);

    this.linkFlow.attach(container);
    this.snackbar.attach(container);
    this.attached = true;

    injectCssReset();
  }

  setConnectDisabled(connectDisabled: boolean) {
    this.linkFlow.setConnectDisabled(connectDisabled);
  }

  /* istanbul ignore next */
  addEthereumChain(_options: {
    onCancel: ErrorHandler;
    onApprove: () => void;
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
  }) {
    // no-op
  }

  /* istanbul ignore next */
  watchAsset(_options: {
    onCancel: ErrorHandler;
    onApprove: () => void;
    type: string;
    address: string;
    symbol?: string;
    decimals?: number;
    image?: string;
  }) {
    // no-op
  }

  /* istanbul ignore next */
  switchEthereumChain(_options: {
    onCancel: ErrorHandler;
    onApprove: () => void;
    chainId: string;
    address?: string;
  }) {
    // no-op
  }

  requestEthereumAccounts(options: { onCancel: ErrorHandler }): void {
    this.linkFlow.open({ onCancel: options.onCancel });
  }

  hideRequestEthereumAccounts(): void {
    this.linkFlow.close();
  }

  /* istanbul ignore next */
  signEthereumMessage(_: {
    request: SignEthereumMessageRequest;
    onSuccess: (response: SignEthereumMessageResponse) => void;
    onCancel: ErrorHandler;
  }): void {
    // No-op
  }

  /* istanbul ignore next */
  signEthereumTransaction(_: {
    request: SignEthereumTransactionRequest;
    onSuccess: (response: SignEthereumTransactionResponse) => void;
    onCancel: ErrorHandler;
  }): void {
    // No-op
  }

  /* istanbul ignore next */
  submitEthereumTransaction(_: {
    request: SubmitEthereumTransactionRequest;
    onSuccess: (response: SubmitEthereumTransactionResponse) => void;
    onCancel: ErrorHandler;
  }): void {
    // No-op
  }

  /* istanbul ignore next */
  ethereumAddressFromSignedMessage(_: {
    request: EthereumAddressFromSignedMessageRequest;
    onSuccess: (response: EthereumAddressFromSignedMessageResponse) => void;
  }): void {
    // No-op
  }

  showConnecting(options: {
    isUnlinkedErrorState?: boolean;
    onCancel: ErrorHandler;
    onResetConnection: () => void;
  }): () => void {
    let snackbarProps: SnackbarInstanceProps;
    if (options.isUnlinkedErrorState) {
      snackbarProps = {
        autoExpand: true,
        message: 'Connection lost',
        appSrc: this.appSrc,
        menuItems: [
          {
            isRed: false,
            info: 'Reset connection',
            svgWidth: '10',
            svgHeight: '11',
            path: 'M5.00008 0.96875C6.73133 0.96875 8.23758 1.94375 9.00008 3.375L10.0001 2.375V5.5H9.53133H7.96883H6.87508L7.80633 4.56875C7.41258 3.3875 6.31258 2.53125 5.00008 2.53125C3.76258 2.53125 2.70633 3.2875 2.25633 4.36875L0.812576 3.76875C1.50008 2.125 3.11258 0.96875 5.00008 0.96875ZM2.19375 6.43125C2.5875 7.6125 3.6875 8.46875 5 8.46875C6.2375 8.46875 7.29375 7.7125 7.74375 6.63125L9.1875 7.23125C8.5 8.875 6.8875 10.0312 5 10.0312C3.26875 10.0312 1.7625 9.05625 1 7.625L0 8.625V5.5H0.46875H2.03125H3.125L2.19375 6.43125Z',
            defaultFillRule: 'evenodd',
            defaultClipRule: 'evenodd',
            onClick: options.onResetConnection,
          },
        ],
      };
    } else {
      snackbarProps = {
        message: 'Confirm on phone',
        appSrc: this.appSrc,
        menuItems: [
          {
            isRed: true,
            info: 'Cancel transaction',
            svgWidth: '11',
            svgHeight: '11',
            path: 'M10.3711 1.52346L9.21775 0.370117L5.37109 4.21022L1.52444 0.370117L0.371094 1.52346L4.2112 5.37012L0.371094 9.21677L1.52444 10.3701L5.37109 6.53001L9.21775 10.3701L10.3711 9.21677L6.53099 5.37012L10.3711 1.52346Z',
            defaultFillRule: 'inherit',
            defaultClipRule: 'inherit',
            onClick: options.onCancel,
          },
          {
            isRed: false,
            info: 'Reset connection',
            svgWidth: '10',
            svgHeight: '11',
            path: 'M5.00008 0.96875C6.73133 0.96875 8.23758 1.94375 9.00008 3.375L10.0001 2.375V5.5H9.53133H7.96883H6.87508L7.80633 4.56875C7.41258 3.3875 6.31258 2.53125 5.00008 2.53125C3.76258 2.53125 2.70633 3.2875 2.25633 4.36875L0.812576 3.76875C1.50008 2.125 3.11258 0.96875 5.00008 0.96875ZM2.19375 6.43125C2.5875 7.6125 3.6875 8.46875 5 8.46875C6.2375 8.46875 7.29375 7.7125 7.74375 6.63125L9.1875 7.23125C8.5 8.875 6.8875 10.0312 5 10.0312C3.26875 10.0312 1.7625 9.05625 1 7.625L0 8.625V5.5H0.46875H2.03125H3.125L2.19375 6.43125Z',
            defaultFillRule: 'evenodd',
            defaultClipRule: 'evenodd',
            onClick: options.onResetConnection,
          },
        ],
      };
    }

    return this.snackbar.presentItem(snackbarProps);
  }

  /* istanbul ignore next */
  setAppSrc(appSrc: string): void {
    this.appSrc = appSrc;
  }

  /* istanbul ignore next */
  reloadUI(): void {
    document.location.reload();
  }

  /* istanbul ignore next */
  inlineAccountsResponse(): boolean {
    return false;
  }

  /* istanbul ignore next */
  inlineAddEthereumChain(_chainId: string): boolean {
    return false;
  }

  /* istanbul ignore next */
  inlineWatchAsset(): boolean {
    return false;
  }

  /* istanbul ignore next */
  inlineSwitchEthereumChain(): boolean {
    return false;
  }

  /* istanbul ignore next */
  setStandalone(status: boolean): void {
    this.standalone = status;
  }

  /* istanbul ignore next */
  isStandalone(): boolean {
    return this.standalone ?? false;
  }
}
