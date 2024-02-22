import { ErrorHandler } from '../../../core/error';
import { RelayUI } from '../../RelayUI';
import { RedirectDialog } from './components/RedirectDialog/RedirectDialog';
import { getLocation } from './util';

export class WLMobileRelayUI implements RelayUI {
  private readonly redirectDialog: RedirectDialog;
  private attached = false;
  private openedWindow: Window | null = null;

  constructor() {
    this.redirectDialog = new RedirectDialog();
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

  private redirectToCoinbaseWallet(walletLinkUrl?: string): void {
    const url = new URL('https://go.cb-w.com/walletlink');

    url.searchParams.append('redirect_url', getLocation().href);
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
