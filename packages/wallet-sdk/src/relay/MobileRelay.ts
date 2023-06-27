import { getLocation } from "../util";
import { WalletLinkRelay, WalletLinkRelayOptions } from "./WalletLinkRelay";
import { CancelablePromise } from "./WalletSDKRelayAbstract";
import { Web3Method } from "./Web3Method";
import { Web3Request } from "./Web3Request";
import { RequestEthereumAccountsResponse } from "./Web3Response";

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
          location.href,
        )}`;
      }),
      cancel: () => {},
    };
  }

  // override
  protected publishWeb3RequestEvent(id: string, request: Web3Request): void {
    super.publishWeb3RequestEvent(id, request);

    if (this._enableMobileWalletLink) {
      this.openCoinbaseWalletDeeplink(request);
    }
  }

  private openCoinbaseWalletDeeplink(request: Web3Request): void {
    const url = new URL("https://go.cb-w.com/walletlink");

    url.searchParams.append("redirect_url", window.location.href);

    if (request.method === Web3Method.requestEthereumAccounts) {
      const wlUrl = this.getQRCodeUrl();
      if (!wlUrl) throw new Error("WalletLinkUrl is not set");
      url.searchParams.append("wl_url", wlUrl);
    }

    this.diagnostic?.log(`Opening Coinbase Wallet deeplink ${url.href}`);

    window.open(url.href, "_blank");
  }
}
