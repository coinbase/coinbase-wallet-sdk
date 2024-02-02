import { AddressString } from '../../core/type';
import { RequestArguments } from '../../provider/ProviderInterface';
import { SupportedWeb3Method, Web3Request } from '../../relay/walletlink/type/Web3Request';
import { WalletLinkRelay, WalletLinkRelayOptions } from '../../relay/walletlink/WalletLinkRelay';
import { PopUpCommunicator } from '../../transport/PopUpCommunicator';
import { Connector } from '../ConnectorInterface';

// For now this is just a wrapper around the legacy WalletLinkRelay
export class WalletLinkConnector implements Connector {
  legacyRelay: WalletLinkRelay;
  private resolveHandshake?: (accounts: AddressString[]) => void;
  // private chainId?: string;
  // private jsonRpcUrl?: string;
  private puc: PopUpCommunicator;

  constructor({
    legacyRelayOptions,
    puc,
  }: {
    legacyRelayOptions: Readonly<WalletLinkRelayOptions>;
    puc: PopUpCommunicator;
  }) {
    this.legacyRelay = new WalletLinkRelay(legacyRelayOptions);
    this.puc = puc;
    this.accountsCallback = this.accountsCallback.bind(this);
    this.chainCallback = this.chainCallback.bind(this);
    this.legacyRelay.setAccountsCallback(this.accountsCallback);
    this.legacyRelay.setChainCallback(this.chainCallback);
  }

  public async handshake(): Promise<AddressString[]> {
    return new Promise((resolve) => {
      this.resolveHandshake = resolve;
    });
  }

  // private chainCallback(chainId: string, jsonRpcUrl: string) {
  private chainCallback() {
    // temp get modal to close for demo
    // should updateProviderInfo and emit chainChanged event
    this.puc.disconnect();
    // this.chainId = chainId;
    // this.jsonRpcUrl = jsonRpcUrl;
  }

  private accountsCallback(accounts: string[]) {
    this.resolveHandshake?.(accounts as AddressString[]);
  }

  public request<T>(requestArgs: RequestArguments): Promise<T> {
    return this.legacyRelay.sendRequest(requestArgs as Web3Request<SupportedWeb3Method>)
      .promise as Promise<T>;
  }
}
