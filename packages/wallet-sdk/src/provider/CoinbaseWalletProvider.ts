/* eslint-disable jest/no-commented-out-tests */
import EventEmitter from 'eventemitter3';

import { Chain, Connector, ConnectorUpdateListener } from '../connector/ConnectorInterface';
import { SCWConnector } from '../connector/scw/SCWConnector';
import { WLConnector } from '../connector/walletlink/WLConnector';
import { standardErrorCodes, standardErrors } from '../core/error';
import { SerializedEthereumRpcError } from '../core/error/utils';
import { AddressString } from '../core/type';
import { areAddressArraysEqual, prepend0x, showDeprecationWarning } from '../core/util';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { ConnectionType } from '../transport/ConfigMessage';
import { PopUpCommunicator } from '../transport/PopUpCommunicator';
import { getErrorForInvalidRequestArgs } from './helpers/eip1193Utils';
import { ProviderInterface, ProviderRpcError, RequestArguments } from './ProviderInterface';

interface ConstructorOptions {
  storage: ScopedLocalStorage;
  popupCommunicator: PopUpCommunicator;
  appName?: string;
  appLogoUrl?: string | null;
  linkAPIUrl?: string;
}

const ACCOUNTS_KEY = 'accounts';
const CONNECTION_TYPE_KEY = 'connectionType';

export class CoinbaseWalletProvider
  extends EventEmitter
  implements ProviderInterface, ConnectorUpdateListener
{
  private _storage: ScopedLocalStorage;
  private _popupCommunicator: PopUpCommunicator;
  private _accounts: AddressString[];
  private _appName = '';
  private _appLogoUrl: string | null = null;
  private _connector: Connector | undefined;
  private _connectionType: string | null;
  private _chain: Chain = {
    id: 1,
  };
  private _connectionTypeSelectionResolver: ((value: unknown) => void) | undefined;

  constructor(options: Readonly<ConstructorOptions>) {
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
    if (this._connector instanceof WLConnector) return;

    this._connector = new WLConnector({
      appName: this._appName,
      appLogoUrl: this._appLogoUrl,
      storage: this._storage,
      updateListener: this,
    });
  }

  onAccountsChanged(_: Connector, _accounts: AddressString[]) {
    this._setAccounts(_accounts);
  }

  onChainChanged(connector: Connector, chain: Chain): void {
    // if (connector !== this._connector) return; // ignore events from inactive connectors
    if (connector instanceof WLConnector) {
      this._connectionTypeSelectionResolver?.('walletlink');
    }

    if (chain.id !== this._chain.id) {
      this.emit('chainChanged', prepend0x(chain.id.toString(16)));
    }

    this._chain = chain;
  }

  private _emitConnectEvent() {
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

  public get connected() {
    return this._accounts.length > 0;
  }

  disconnect(): void {
    const disconnectInfo: ProviderRpcError = standardErrors.provider.disconnected(
      'User initiated disconnection'
    );
    this._accounts = [];
    this._connectionType = null;
    this._storage.clear(); // clear persisted accounts & connectionType
    this._connector?.disconnect();
    this.emit('disconnect', disconnectInfo);
  }

  // *
  //  deprecated methods - more methods will likely be added here later
  // *
  public async enable(): Promise<unknown> {
    showDeprecationWarning('enable', 'use request({ method: "eth_requestAccounts" })');
    return await this.request({
      method: 'eth_requestAccounts',
    });
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

    try {
      return await this._connector.request(request);
    } catch (err) {
      if ((err as SerializedEthereumRpcError).code === standardErrorCodes.provider.unauthorized) {
        this.disconnect();
      }
      throw err;
    }
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
        if (this._connectionType === 'walletlink') {
          this._popupCommunicator.walletLinkQrScanned();
        }
        this._setAccounts(ethAddresses);
        this._emitConnectEvent();
        return Promise.resolve(this._accounts);
      }
      return Promise.reject(standardErrors.rpc.internal('Failed to get accounts'));
    } catch (err: any) {
      // TODO: remove this. we don't need this.
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
