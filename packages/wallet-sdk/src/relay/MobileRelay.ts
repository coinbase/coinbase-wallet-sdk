import { MobileRelayUI } from '../provider/MobileRelayUI';
import { getLocation } from '../util';
import { WalletLinkRelay, WalletLinkRelayOptions } from './WalletLinkRelay';
import { CancelablePromise } from './WalletSDKRelayAbstract';
import { Web3Method } from './Web3Method';
import { ConnectAndSignInRequest, Web3Request } from './Web3Request';
import { ConnectAndSignInResponse, RequestEthereumAccountsResponse } from './Web3Response';
import { Web3ResponseMessage } from './Web3ResponseMessage';

export class MobileRelay extends WalletLinkRelay {
  private _enableMobileWalletLink: boolean;

  constructor(options: Readonly<WalletLinkRelayOptions>) {
    super(options);
    this._enableMobileWalletLink = options.enableMobileWalletLink ?? false;
  }

  // override
  public requestEthereumAccounts(): CancelablePromise<RequestEthereumAccountsResponse> {
    if (this._enableMobileWalletLink) {
      return super.requestEthereumAccounts();
    }

    // TODO: Implement & present in-page wallet picker instead of navigating to www.coinbase.com/connect-dapp
    return {
      promise: new Promise(() => {
        const location = getLocation();
        location.href = `https://www.coinbase.com/connect-dapp?uri=${encodeURIComponent(
          location.href
        )}`;
      }),
      cancel: () => {},
    };
  }

  // override
  protected publishWeb3RequestEvent(id: string, request: Web3Request): void {
    super.publishWeb3RequestEvent(id, request);

    if (!(this._enableMobileWalletLink && this.ui instanceof MobileRelayUI)) return;

    // For mobile relay requests, open the Coinbase Wallet app
    switch (request.method) {
      case Web3Method.requestEthereumAccounts:
      case Web3Method.connectAndSignIn:
        this.ui.openCoinbaseWalletDeeplink(this.getQRCodeUrl());
        break;
      case Web3Method.switchEthereumChain:
        // switchEthereumChain doesn't need to open the app
        return;
      default:
        this.ui.openCoinbaseWalletDeeplink();
        break;
    }
  }

  // override
  protected handleWeb3ResponseMessage(message: Web3ResponseMessage) {
    super.handleWeb3ResponseMessage(message);

    if (this._enableMobileWalletLink && this.ui instanceof MobileRelayUI) {
      this.ui.closeOpenedWindow();
    }
  }

  connectAndSignIn(params: {
    nonce: string;
    statement?: string;
    resources?: string[];
  }): CancelablePromise<ConnectAndSignInResponse> {
    if (!this._enableMobileWalletLink) {
      throw new Error('connectAndSignIn is supported only when enableMobileWalletLink is on');
    }

    return this.sendRequest<ConnectAndSignInRequest, ConnectAndSignInResponse>({
      method: Web3Method.connectAndSignIn,
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
