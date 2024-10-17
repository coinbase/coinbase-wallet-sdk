import { RedirectDialog } from './components/RedirectDialog/RedirectDialog.js';
import { getLocation } from './components/util.js';
import { RelayUI } from './RelayUI.js';
import { CBW_MOBILE_DEEPLINK_URL } from ':core/constants.js';

export class WLMobileRelayUI implements RelayUI {
  private readonly redirectDialog: RedirectDialog;
  private attached = false;

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

  private redirectToCoinbaseWallet(walletLinkUrl?: string): void {
    const url = new URL(CBW_MOBILE_DEEPLINK_URL);

    url.searchParams.append('redirect_url', getLocation().href);
    if (walletLinkUrl) {
      url.searchParams.append('wl_url', walletLinkUrl);
    }

    const anchorTag = document.createElement('a');
    anchorTag.target = 'cbw-opener';
    anchorTag.href = url.href;
    anchorTag.rel = 'noreferrer noopener';
    anchorTag.click();
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
    onCancel: (error?: Error) => void;
    onResetConnection: () => void;
  }): () => void {
    // it uses the return callback to clear the dialog
    return () => {
      this.redirectDialog.clear();
    };
  }
}
