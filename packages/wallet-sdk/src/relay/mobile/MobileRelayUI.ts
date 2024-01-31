import { ErrorHandler } from '../../core/error';
import { RelayUI, RelayUIOptions } from '../RelayUI';
import { RedirectDialog } from '../walletlink/ui/components/RedirectDialog/RedirectDialog';

// TODO: deprecate this class and remove it from CoinbaseWalletSDK
export class MobileRelayUI implements RelayUI {
  private readonly redirectDialog: RedirectDialog;
  private attached = false;
  private darkMode = false;
  private openedWindow: Window | null = null;

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

  closeOpenedWindow() {
    this.openedWindow?.close();
    this.openedWindow = null;
  }

  // TODO: move this to SCW FE
  // on mobile, instead of rendering QR code,
  // it should show a button to redirect to Coinbase Wallet with this format of deeplink:
  private redirectToCoinbaseWallet(walletLinkUrl?: string): void {
    const url = new URL('https://go.cb-w.com/walletlink');

    url.searchParams.append('redirect_url', window.location.href);
    if (walletLinkUrl) {
      url.searchParams.append('wl_url', walletLinkUrl);
    }

    this.openedWindow = window.open(url.href, 'cbw-opener');
    if (this.openedWindow) {
      setTimeout(() => this.closeOpenedWindow(), 5000);
    }
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
      this.closeOpenedWindow();
      this.redirectDialog.clear();
    };
  }

  reloadUI() {} // no-op
}
