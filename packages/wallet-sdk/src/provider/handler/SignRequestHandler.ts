import { ConnectionPreference } from '../../CoinbaseWalletSDK';
import { Chain, Connector, ConnectorUpdateListener } from '../../connector/ConnectorInterface';
import { SCWConnector } from '../../connector/scw/SCWConnector';
import { WLConnector } from '../../connector/walletlink/WLConnector';
import { standardErrorCodes, standardErrors } from '../../core/error';
import { SerializedEthereumRpcError } from '../../core/error/utils';
import { AddressString } from '../../core/type';
import { ScopedLocalStorage } from '../../lib/ScopedLocalStorage';
import { ConnectionType } from '../../transport/ConfigMessage';
import { PopUpCommunicator } from '../../transport/PopUpCommunicator';
import { RequestArguments } from '../ProviderInterface';
import { RequestHandler } from './RequestHandler';

export interface SignRequestHandlingUpdateListener {
  onAccountsChanged: (accounts: AddressString[]) => void;
  onChainChanged: (chain: Chain) => void;
  onConnect: () => void;
  onResetConnection: () => void;
}

interface SignRequestHandlerOptions {
  storage: ScopedLocalStorage;
  scwUrl?: string;
  appName?: string;
  appLogoUrl?: string | null;
  appChainIds: number[];
  connectionPreference: ConnectionPreference;
  updateListener: SignRequestHandlingUpdateListener;
}

const CONNECTION_TYPE_KEY = 'SignRequestHandler:connectionType';

export class SignRequestHandler implements RequestHandler, ConnectorUpdateListener {
  private _appName: string;
  private _appLogoUrl: string | null;
  private _appChainIds: number[];
  private _connectionPreference: ConnectionPreference;

  private _connectionType: string | null;
  private _connectionTypeSelectionResolver: ((value: unknown) => void) | undefined;
  private _connector: Connector | undefined;

  private _storage: ScopedLocalStorage;
  private _popupCommunicator: PopUpCommunicator;
  private _updateListener: SignRequestHandlingUpdateListener;

  constructor(options: Readonly<SignRequestHandlerOptions>) {
    this._storage = options.storage;
    this._popupCommunicator = new PopUpCommunicator({
      url: options.scwUrl || 'https://keys.coinbase.com/connect',
    });
    this._updateListener = options.updateListener;

    // getWalletLinkUrl is called by the PopUpCommunicator when
    // it receives message.type === 'wlQRCodeUrl' from the cb-wallet-scw popup
    // its injected because we don't want to instantiate WalletLinkConnector until we have to
    this.getWalletLinkUrl = this.getWalletLinkUrl.bind(this);
    this._popupCommunicator.setWLQRCodeUrlCallback(this.getWalletLinkUrl);

    this._appName = options.appName ?? '';
    this._appLogoUrl = options.appLogoUrl ?? null;
    this._appChainIds = options.appChainIds;

    const persistedConnectionType = this._storage.getItem(CONNECTION_TYPE_KEY);
    this._connectionType = persistedConnectionType;
    this._connectionPreference = options.connectionPreference;

    if (persistedConnectionType) {
      this._initConnector();
    }

    this._setConnectionType = this._setConnectionType.bind(this);
    this._initWalletLinkConnector = this._initWalletLinkConnector.bind(this);
  }

  onAccountsChanged(_connector: Connector, accounts: AddressString[]) {
    this._updateListener.onAccountsChanged(accounts);
  }

  onChainChanged(connector: Connector, chain: Chain): void {
    // if (connector !== this._connector) return; // ignore events from inactive connectors
    if (connector instanceof WLConnector) {
      this._connectionTypeSelectionResolver?.('walletlink');
    }

    this._updateListener.onChainChanged(chain);
  }

  private _initConnector = () => {
    if (this._connectionType === 'scw') {
      this._initScwConnector();
    } else if (this._connectionType === 'walletlink') {
      this._initWalletLinkConnector();
    }
  };

  private _initScwConnector() {
    if (this._connector instanceof SCWConnector) return;
    this._connector = new SCWConnector({
      appName: this._appName,
      appLogoUrl: this._appLogoUrl,
      appChainIds: this._appChainIds,
      puc: this._popupCommunicator,
      storage: this._storage,
      updateListener: this,
    });
  }

  private _initWalletLinkConnector() {
    if (this._connector instanceof WLConnector) return;

    this._connector = new WLConnector({
      appName: this._appName,
      appLogoUrl: this._appLogoUrl,
      storage: this._storage,
      updateListener: this,
    });
  }

  async onDisconnect() {
    this._connectionType = null;
    await this._connector?.disconnect();
  }

  async handleRequest(request: RequestArguments, accounts: AddressString[], _chain: Chain) {
    try {
      if (request.method === 'eth_requestAccounts') {
        return this._eth_requestAccounts(accounts);
      }

      if (!this._connector || accounts.length <= 0) {
        throw standardErrors.provider.unauthorized(
          "Must call 'eth_requestAccounts' before other methods"
        );
      }

      return await this._connector.request(request);
    } catch (err) {
      if ((err as SerializedEthereumRpcError).code === standardErrorCodes.provider.unauthorized) {
        this._updateListener.onResetConnection();
      }
      throw err;
    }
  }

  async _eth_requestAccounts(accounts: AddressString[]): Promise<AddressString[]> {
    if (accounts.length > 0) {
      this._updateListener.onConnect();
      return Promise.resolve(accounts);
    }

    if (!this._connectionType) {
      // WL: this promise hangs until the QR code is scanned
      // SCW: this promise hangs until the user signs in with passkey
      const connectionType = await this._completeConnectionTypeSelection();
      this._setConnectionType(connectionType as ConnectionType);
    }

    // in the case of walletlink, this doesn't do anything since connector is initialized
    // when the wallet link QR code url is requested
    this._initConnector();

    const ethAddresses = await this._connector?.handshake();
    if (Array.isArray(ethAddresses)) {
      if (this._connectionType === 'walletlink') {
        this._popupCommunicator.walletLinkQrScanned();
      }
      this._updateListener.onAccountsChanged(ethAddresses);
      this._updateListener.onConnect();
      return Promise.resolve(ethAddresses);
    }
    return Promise.reject(standardErrors.rpc.internal('Failed to get accounts'));
  }

  private getWalletLinkUrl() {
    this._initWalletLinkConnector();
    if (!(this._connector instanceof WLConnector)) {
      throw standardErrors.rpc.internal(
        'Connector not initialized or Connector.getWalletLinkUrl not defined'
      );
    }
    return this._connector.getQRCodeUrl();
  }

  private async _completeConnectionTypeSelection() {
    await this._popupCommunicator.connect();

    return new Promise((resolve) => {
      this._connectionTypeSelectionResolver = resolve.bind(this);

      this._popupCommunicator
        .selectConnectionType({
          connectionPreference: this._connectionPreference,
        })
        .then((connectionType) => {
          resolve(connectionType);
        });
    });
  }

  // storage methods
  private _setConnectionType(connectionType: string) {
    if (this._connectionType === connectionType) return;
    this._connectionType = connectionType;
    this._storage.setItem(CONNECTION_TYPE_KEY, this._connectionType);
  }

  canHandleRequest(request: RequestArguments): boolean {
    const methodsThatRequireSigning = [
      'eth_requestAccounts',
      'eth_sign',
      'eth_ecRecover',
      'personal_sign',
      'personal_ecRecover',
      'eth_signTransaction',
      'eth_sendTransaction',
      'eth_signTypedData_v1',
      'eth_signTypedData_v2',
      'eth_signTypedData_v3',
      'eth_signTypedData_v4',
      'eth_signTypedData',
      'wallet_addEthereumChain',
      'wallet_switchEthereumChain',
      'wallet_watchAsset',
    ];

    return methodsThatRequireSigning.includes(request.method);
  }
}
