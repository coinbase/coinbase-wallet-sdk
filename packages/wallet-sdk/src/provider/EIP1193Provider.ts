import EventEmitter from 'eventemitter3';

import { Chain, Connector, ConnectorUpdateListener } from '../connector/ConnectorInterface';
import { SCWConnector } from '../connector/scw/SCWConnector';
import { WalletLinkConnector } from '../connector/walletlink/WalletLinkConnector';
import { LINK_API_URL } from '../core/constants';
import { standardErrors } from '../core/error';
import { AddressString } from '../core/type';
import { areAddressArraysEqual, prepend0x } from '../core/util';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { WalletLinkRelayUI } from '../relay/walletlink/ui/WalletLinkRelayUI';
import { ConnectionType } from '../transport/ConfigMessage';
import { PopUpCommunicator } from '../transport/PopUpCommunicator';
import { LIB_VERSION } from '../version';
import { getErrorForInvalidRequestArgs } from './helpers/eip1193Utils';
import { ProviderInterface, ProviderRpcError, RequestArguments } from './ProviderInterface';

export interface EIP1193ProviderOptions {
  storage: ScopedLocalStorage;
  popupCommunicator: PopUpCommunicator;
  appName?: string;
  appLogoUrl?: string | null;
  linkAPIUrl?: string;
}
interface DisconnectInfo {
  error: ProviderRpcError;
}

const ACCOUNTS_KEY = 'accounts';
const CONNECTION_TYPE_KEY = 'connectionType';

export class EIP1193Provider
  extends EventEmitter
  implements ProviderInterface, ConnectorUpdateListener
{
  private _storage: ScopedLocalStorage;
  private _popupCommunicator: PopUpCommunicator;

  connected: boolean;
  private _accounts: AddressString[];
  private _appName = '';
  private _appLogoUrl: string | null = null;
  private _connector: Connector | undefined;
  private _connectionType: string | null;
  private _chain: Chain = {
    id: 1,
  };
  private _connectionTypeSelectionResolver: ((value: unknown) => void) | undefined;

  constructor(options: Readonly<EIP1193ProviderOptions>) {
    super();
    this._storage = options.storage;
    this._popupCommunicator = options.popupCommunicator;

    // getWalletLinkUrl is called by the PopUpCommunicator when
    // it receives message.type === 'wlQRCodeUrl' from the cb-wallet-scw popup
    // its injected becuause we don't want to instantiate WalletLinkConnector until we have to
    this.getWalletLinkUrl = this.getWalletLinkUrl.bind(this);
    this._popupCommunicator.setWLQRCodeUrlCallback(this.getWalletLinkUrl);

    this._appName = options.appName ?? '';
    this._appLogoUrl = options.appLogoUrl ?? null;
    this.connected = false;
    const persistedAccounts = this._getStoredAccounts();
    this._accounts = persistedAccounts;
    const persistedConnectionType = this._storage.getItem(CONNECTION_TYPE_KEY);
    this._connectionType = persistedConnectionType;
    if (persistedConnectionType) {
      this._initConnector();
    }

    this._setConnectionType = this._setConnectionType.bind(this);
    this._initWalletLinkConnector = this._initWalletLinkConnector.bind(this);
    this.onChainChanged = this.onChainChanged.bind(this);
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
      puc: this._popupCommunicator,
      storage: this._storage,
      updateListener: this,
    });
  }

  private _initWalletLinkConnector() {
    if (this._connector instanceof WalletLinkConnector) return;
    const legacyRelayOptions = {
      linkAPIUrl: LINK_API_URL,
      version: LIB_VERSION,
      darkMode: false,
      uiConstructor: () =>
        new WalletLinkRelayUI({
          linkAPIUrl: LINK_API_URL,
          version: LIB_VERSION,
          darkMode: false,
        }),
      storage: this._storage,
    };

    this._connector = new WalletLinkConnector({
      legacyRelayOptions,
      puc: this._popupCommunicator,
      _connectionTypeSelectionResolver: this._connectionTypeSelectionResolver,
      _accounts: this._accounts,
      updateListener: this,
    });
  }

  onChainChanged(_: Connector, chain: Chain): void {
    // if (connector !== this._connector) return; // ignore events from inactive connectors
    if (chain.id !== this._chain.id) {
      this.emit('chainChanged', prepend0x(chain.id.toString(16)));
    }

    this._chain = chain;
  }

  private _emitConnectEvent() {
    this.connected = true;
    // https://eips.ethereum.org/EIPS/eip-1193#connect
    this.emit('connect', { chainId: prepend0x(this._chain.id.toString(16)) });
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    const invalidArgsError = getErrorForInvalidRequestArgs(args);
    if (invalidArgsError) {
      throw invalidArgsError;
    }

    return this._handleRequest<T>(args);
  }

  // disconnect is not required, and not called by test app
  disconnect(): void {
    const disconnectInfo: DisconnectInfo = {
      error: standardErrors.provider.disconnected('User initiated disconnection'),
    };
    this._storage.clear();
    this.connected = false;
    this.emit('disconnect', disconnectInfo);
  }

  // *
  //  deprecated methods - more methods will likely be added here later
  // *
  public async enable(): Promise<unknown> {
    this._showDeprecationWarning('enable', 'request({ method: "eth_requestAccounts" })');
    return await this.request({
      method: 'eth_requestAccounts',
    });
  }

  private _showDeprecationWarning(oldMethod: string, newMethod: string): void {
    console.warn(`EIP1193Provider: ${oldMethod} is deprecated. Please use ${newMethod} instead.`);
  }

  private async _handleRequest<T>(request: RequestArguments): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      try {
        switch (request.method) {
          case 'eth_chainId':
            return resolve(this._chain?.id as T);
          case 'eth_accounts':
            return resolve(this._eth_accounts() as T);
          case 'eth_requestAccounts':
            return resolve(this._eth_requestAccounts() as T);
          default:
            return resolve(this._genericConnectorRequest<T>(request));
        }
      } catch (error) {
        return reject(error);
      }
    });
  }

  private _requireAuthorization() {
    if (this._accounts.length < 0) {
      throw standardErrors.provider.unauthorized({});
    }
  }

  private async _genericConnectorRequest<T>(request: RequestArguments): Promise<T> {
    this._requireAuthorization();
    if (!this._connector) {
      throw standardErrors.provider.unauthorized(
        "Must call 'eth_requestAccounts' before other methods"
      );
    }

    return await this._connector.request(request);
  }

  private _eth_accounts(): AddressString[] {
    if (!this._accounts) {
      throw standardErrors.provider.unauthorized(
        "Must call 'eth_requestAccounts' before 'eth_accounts'"
      );
    }
    return this._accounts;
  }

  private async _eth_requestAccounts(): Promise<AddressString[]> {
    if (this._accounts.length > 0) {
      this._emitConnectEvent();
      return Promise.resolve(this._accounts);
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

    try {
      const ethAddresses = await this._connector?.handshake();
      if (Array.isArray(ethAddresses)) {
        this._setAccounts(ethAddresses);
        this._emitConnectEvent();
        return Promise.resolve(this._accounts);
      }
      return Promise.reject(new Error('Accounts must be an array of addresses'));
    } catch (err: any) {
      if (typeof err.message === 'string' && err.message.match(/(denied|rejected)/i)) {
        throw standardErrors.provider.userRejectedRequest('User denied account authorization');
      }
      throw err;
    }
  }

  private _setAccounts(accounts: AddressString[]) {
    if (areAddressArraysEqual(this._accounts, accounts)) {
      return;
    }

    this._accounts = accounts;
    this._setStoredAccounts(accounts);
    this.emit('accountsChanged', this._accounts);
  }

  private getWalletLinkUrl() {
    this._initWalletLinkConnector();
    if (!(this._connector instanceof WalletLinkConnector)) {
      throw new Error('Connector not initialized or Connector.getWalletLinkUrl not defined');
    }
    return this._connector.legacyRelay.getQRCodeUrl();
  }

  private async _completeConnectionTypeSelection() {
    await this._popupCommunicator.connect();

    return new Promise((resolve) => {
      this._connectionTypeSelectionResolver = resolve.bind(this);

      this._popupCommunicator.selectConnectionType().then((connectionType) => {
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

  private _setStoredAccounts(accounts: AddressString[]) {
    try {
      this._storage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (error) {
      // TODO: error handling
      console.error('Error storing accounts to local storage:', error);
    }
  }

  private _getStoredAccounts(): AddressString[] {
    try {
      const storedAccounts = this._storage.getItem(ACCOUNTS_KEY);
      return storedAccounts ? JSON.parse(storedAccounts) : [];
    } catch (error) {
      // TODO: error handling
      console.error('Error retrieving accounts from storage:', error);
      return [];
    }
  }
}
