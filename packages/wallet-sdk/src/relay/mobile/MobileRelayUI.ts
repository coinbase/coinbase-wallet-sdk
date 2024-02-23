import { ErrorHandler } from '../../core/error';
import { RelayUI, RelayUIOptions } from '../RelayUI';
import { RedirectDialog } from '../walletlink/ui/components/RedirectDialog/RedirectDialog';

// TODO: Implement & present in-page wallet picker instead of navigating to www.coinbase.com/connect-dapp
export class MobileRelayUI implements RelayUI {
  private readonly redirectDialog: RedirectDialog;
  private attached = false;
  private darkMode = false;

  constructor(options: Readonly<RelayUIOptions>) {
    this.redirectDialog = new RedirectDialog();
    this.darkMode = options.darkMode;
  }

  attach() {
    if (this.attached) {
      throw new Error('Coinbase Wallet SDK UI is already attached');
    }
    this.redirectDialog.attach();
    this.attached = true;
  }

  setConnected(_connected: boolean) {} // no-op


  private redirectToCoinbaseWallet(walletLinkUrl?: string): void {
    const url = new URL('https://go.cb-w.com/walletlink');

    url.searchParams.append('redirect_url', window.location.href);
    if (walletLinkUrl) {
      url.searchParams.append('wl_url', walletLinkUrl);
    }

    window.location.href = url.href;

  }

  openCoinbaseWalletDeeplink(walletLinkUrl?: string): void {
    this.redirectDialog.present({
      title: 'Redirecting to Coinbase Wallet...',
      buttonText: 'Open',
      darkMode: this.darkMode,
      onButtonClick: () => {
        this.redirectToCoinbaseWallet(walletLinkUrl);
      },
    });

    setTimeout(() => {
      this.redirectToCoinbaseWallet(walletLinkUrl);
    }, 99);
  }

  showConnecting(_options: {
    isUnlinkedErrorState?: boolean | undefined;
    onCancel: ErrorHandler;
    onResetConnection: () => void;
  }): () => void {
    // it uses the return callback to clear the dialog
    return () => {
      this.redirectDialog.clear();
    };
  }

  hideRequestEthereumAccounts() {
    this.redirectDialog.clear();
  }

  // -- Methods below are not needed for mobile

  requestEthereumAccounts() {} // no-op

  addEthereumChain() {} // no-op

  watchAsset() {} // no-op

  selectProvider?() {} // no-op

  switchEthereumChain() {} // no-op

  signEthereumMessage() {} // no-op

  signEthereumTransaction() {} // no-op

  submitEthereumTransaction() {} // no-op

  ethereumAddressFromSignedMessage() {} // no-op

  reloadUI() {} // no-op

  setStandalone?() {} // no-op

  setConnectDisabled() {} // no-op

  inlineAccountsResponse(): boolean {
    return false;
  }

  inlineAddEthereumChain(): boolean {
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
