import { getLocation } from '../../core/util';
import { CancelablePromise } from '../RelayAbstract';
import { WalletLinkResponseEventData } from '../walletlink/type/WalletLinkEventData';
import { Web3Request } from '../walletlink/type/Web3Request';
import { Web3Response } from '../walletlink/type/Web3Response';
import { WalletLinkRelay, WalletLinkRelayOptions } from '../walletlink/WalletLinkRelay';
import { MobileRelayUI } from './MobileRelayUI';

export class MobileRelay extends WalletLinkRelay {
  private _enableMobileWalletLink: boolean;

  constructor(options: Readonly<WalletLinkRelayOptions>) {
    super(options);
    this._enableMobileWalletLink = options.enableMobileWalletLink ?? false;
  }

  // override
  public requestEthereumAccounts(): CancelablePromise<Web3Response<'requestEthereumAccounts'>> {
    if (this._enableMobileWalletLink) {
      return super.requestEthereumAccounts();
    }

    // TODO: Implement & present in-page wallet picker instead of navigating to www.coinbase.com/connect-dapp
    return {
      promise: new Promise(() => {
        const location = getLocation();
        location.href = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(location.href)}`;
      }),
      cancel: () => {},
    };
  }

  // override
  protected publishWeb3RequestEvent(id: string, request: Web3Request): void {
    super.publishWeb3RequestEvent(id, request);

    if (!(this._enableMobileWalletLink && this.ui instanceof MobileRelayUI)) return;

    let navigatedToCBW = false;

    // For mobile relay requests, open the Coinbase Wallet app
    switch (request.method) {
      case 'requestEthereumAccounts':
      case 'connectAndSignIn':
        navigatedToCBW = true;
        this.ui.openCoinbaseWalletDeeplink(this.getQRCodeUrl());
        break;
      case 'switchEthereumChain':
        // switchEthereumChain doesn't need to open the app
        return;
      default:
        navigatedToCBW = true;
        this.ui.openCoinbaseWalletDeeplink();
        break;
    }

    // If the user navigated to the Coinbase Wallet app, then we need to check
    // for unseen events once the user returns to the browser
    if (navigatedToCBW) {
      window.addEventListener(
        'blur',
        () => {
          window.addEventListener(
            'focus',
            () => {
              this.connection.checkUnseenEvents();
            },
            { once: true }
          );
        },
        { once: true }
      );
    }
  }

  // override
  handleWeb3ResponseMessage(message: WalletLinkResponseEventData) {
    super.handleWeb3ResponseMessage(message);

    if (this._enableMobileWalletLink && this.ui instanceof MobileRelayUI) {
      this.ui.closeOpenedWindow();
    }
  }

  connectAndSignIn(params: {
    nonce: string;
    statement?: string;
    resources?: string[];
  }): CancelablePromise<Web3Response<'connectAndSignIn'>> {
    if (!this._enableMobileWalletLink) {
      throw new Error('connectAndSignIn is supported only when enableMobileWalletLink is on');
    }

    return this.sendRequest({
      method: 'connectAndSignIn',
      params: {
        appName: this.appName,
        appLogoUrl: this.appLogoUrl,

        domain: window.location.hostname,
        aud: window.location.href,
        version: '1',
        type: 'eip4361',
        nonce: params.nonce,
        iat: new Date().toISOString(),
        chainId: `eip155:${this.dappDefaultChain}`,
        statement: params.statement,
        resources: params.resources,
      },
    });
  }
}
