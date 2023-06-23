import { isInIFrame } from "../util";
import { WalletLinkRelay, WalletLinkRelayOptions } from "./WalletLinkRelay";
import { CancelablePromise } from "./WalletSDKRelayAbstract";
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
        let location: Location;
        try {
          if (isInIFrame() && window.top) {
            location = window.top.location;
          } else {
            location = window.location;
          }
        } catch (e) {
          location = window.location;
        }

        location.href = `https://www.coinbase.com/connect-dapp?uri=${encodeURIComponent(
          location.href,
        )}`;
      }),
      cancel: () => {},
    };
  }
}
