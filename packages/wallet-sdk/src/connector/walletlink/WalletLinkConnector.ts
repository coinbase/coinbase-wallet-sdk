import { AddressString } from '../../core/type';
import { RequestArguments } from '../../provider/ProviderInterface';
import { SupportedWeb3Method, Web3Request } from '../../relay/walletlink/type/Web3Request';
import { WalletLinkRelay, WalletLinkRelayOptions } from '../../relay/walletlink/WalletLinkRelay';
import { Connector } from '../ConnectorInterface';

// For now this is just a wrapper around the legacy WalletLinkRelay
export class WalletLinkConnector implements Connector {
  legacyRelay: WalletLinkRelay;
  private resolveHandshake?: (accounts: AddressString[]) => void;

  constructor({ legacyRelayOptions }: { legacyRelayOptions: Readonly<WalletLinkRelayOptions> }) {
    this.legacyRelay = new WalletLinkRelay(legacyRelayOptions);
    this.accountsCallback = this.accountsCallback.bind(this);
    this.legacyRelay.setAccountsCallback(this.accountsCallback);
  }

  public async handshake(): Promise<AddressString[]> {
    return new Promise((resolve) => {
      this.resolveHandshake = resolve;
    });
  }

  private accountsCallback(accounts: string[]) {
    this.resolveHandshake?.(accounts as AddressString[]);
  }

  public request<T>(requestArgs: RequestArguments): Promise<T> {
    return this.legacyRelay.sendRequest(requestArgs as Web3Request<SupportedWeb3Method>)
      .promise as Promise<T>;
  }
}
