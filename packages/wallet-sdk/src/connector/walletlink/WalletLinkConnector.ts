import { AddressString } from '../../core/type';
import { RequestArguments } from '../../provider/ProviderInterface';
import { SupportedWeb3Method, Web3Request } from '../../relay/walletlink/type/Web3Request';
import { isErrorResponse } from '../../relay/walletlink/type/Web3Response';
import { WalletLinkRelay, WalletLinkRelayOptions } from '../../relay/walletlink/WalletLinkRelay';
import { PopUpCommunicator } from '../../transport/PopUpCommunicator';
import { Connector } from '../ConnectorInterface';

// For now this is just a wrapper around the legacy WalletLinkRelay
export class WalletLinkConnector implements Connector {
  legacyRelay: WalletLinkRelay;
  private resolveHandshake?: (accounts: AddressString[]) => void;
  private puc: PopUpCommunicator;
  private dappDefaultChain = 1;
  private _connectionTypeSelectionResolver: ((value: unknown) => void) | undefined;

  constructor({
    legacyRelayOptions,
    puc,
    _connectionTypeSelectionResolver,
  }: {
    legacyRelayOptions: Readonly<WalletLinkRelayOptions>;
    puc: PopUpCommunicator;
    _connectionTypeSelectionResolver: ((value: unknown) => void) | undefined;
  }) {
    this.legacyRelay = new WalletLinkRelay(legacyRelayOptions);
    this.puc = puc;
    this._connectionTypeSelectionResolver = _connectionTypeSelectionResolver;
    this.accountsCallback = this.accountsCallback.bind(this);
    this.chainCallback = this.chainCallback.bind(this);
    this.legacyRelay.setAccountsCallback(this.accountsCallback);
    this.legacyRelay.setChainCallback(this.chainCallback);
    this.legacyRelay.setDappDefaultChainCallback(this.dappDefaultChain);
  }

  public async handshake(): Promise<AddressString[]> {
    const res = await this.legacyRelay.requestEthereumAccounts().promise;
    if (isErrorResponse(res)) {
      throw new Error(res.errorMessage);
    }
    // TODO: nate - send message to scw-fe and allow fe to show success
    // and gracefully close the popup
    this.puc.disconnect(); // temporary 'solution' for closing popup
    return res.result;
  }

  // The callback triggered by QR Code Scanning
  private async chainCallback() {
    // as soon as qr code is scanned, resolve hanging selection type promise
    // since we never get a response for that in the case of walletlink
    this._connectionTypeSelectionResolver?.('walletlink');
  }

  private accountsCallback(accounts: string[]) {
    this.resolveHandshake?.(accounts as AddressString[]);
  }

  public request<T>(requestArgs: RequestArguments): Promise<T> {
    return this.legacyRelay.sendRequest(requestArgs as Web3Request<SupportedWeb3Method>)
      .promise as Promise<T>;
  }
}
