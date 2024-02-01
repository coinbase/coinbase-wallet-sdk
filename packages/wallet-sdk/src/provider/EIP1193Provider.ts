import EventEmitter from 'eventemitter3';

import { Connector } from '../connector/ConnectorInterface';
import { KeyStorage } from '../connector/scw/protocol/key/KeyStorage';
import { SCWConnector } from '../connector/scw/SCWConnector';
import { WalletLinkConnector } from '../connector/walletlink/WalletLinkConnector';
import { LINK_API_URL } from '../core/constants';
import { standardErrors } from '../core/error';
import { AddressString } from '../core/type';
import { areAddressArraysEqual, prepend0x } from '../core/util';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { RelayEventManager } from '../relay/RelayEventManager';
import { WalletLinkRelayUI } from '../relay/walletlink/ui/WalletLinkRelayUI';
import { PopUpCommunicator } from '../transport/PopUpCommunicator';
import { LIB_VERSION } from '../version';
import { CoinbaseWalletProviderOptions } from './CoinbaseWalletProvider';
import { getErrorForInvalidRequestArgs } from './helpers/eip1193Utils';
import { ProviderInterface, ProviderRpcError, RequestArguments } from './ProviderInterface';

export interface EIP1193ProviderOptions
  extends Omit<CoinbaseWalletProviderOptions, 'relayProvider'> {
  reloadOnDisconnect?: boolean;
  enableMobileWalletLink?: boolean;
  linkAPIUrl?: string;
  popupCommunicator: PopUpCommunicator;
  appName?: string;
  appLogoUrl?: string | null;
}
interface DisconnectInfo {
  error: ProviderRpcError;
}

const ACCOUNTS_KEY = 'accounts';
const CONNECTION_TYPE_KEY = 'connectionType';

export class EIP1193Provider extends EventEmitter implements ProviderInterface {
  // private _oldProvider!: CoinbaseWalletProvider;
  private _storage: ScopedLocalStorage;
  private _popupCommunicator: PopUpCommunicator;

  connected: boolean;
  private _accounts: AddressString[];
  private _appName = '';
  private _appLogoUrl: string | null = null;
  // private _options: Readonly<EIP1193ProviderOptions>;
  private _connector: Connector | undefined;
  private _connectionType: string | null;
  private _chainId: number;

  constructor(options: Readonly<EIP1193ProviderOptions>) {
    super();
    this._storage = options.storage;
    this._popupCommunicator = options.popupCommunicator;
    this._appName = options.appName ?? '';
    this._appLogoUrl = options.appLogoUrl ?? null;
    this._chainId = options.chainId;
    this.connected = false;
    const persistedAccounts = this._getStoredAccounts();
    this._accounts = persistedAccounts;
    const persistedConnectionType = this._storage.getItem(CONNECTION_TYPE_KEY);
    this._connectionType = persistedConnectionType;
    if (persistedConnectionType === 'scw') {
      this._initConnector();
    }
    this.getWalletLinkUrl = this.getWalletLinkUrl.bind(this);
  }

  private _initConnector = () => {
    if (this._connectionType === 'scw') {
      this._connector = new SCWConnector({
        appName: this._appName,
        appLogoUrl: this._appLogoUrl,
        puc: this._popupCommunicator,
        keyStorage: new KeyStorage(this._storage),
      });
    } else if (this._connectionType === 'walletlink') {
      this.initWalletLinkConnector();
    }
  };

  private initWalletLinkConnector() {
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
      relayEventManager: new RelayEventManager(),
    };

    this._connector = new WalletLinkConnector({
      legacyRelayOptions,
    });
  }

  private get _chainIdStr(): string {
    return prepend0x(this._chainId.toString(16));
  }

  private _emitConnectEvent() {
    this.connected = true;
    // https://eips.ethereum.org/EIPS/eip-1193#connect
    this.emit('connect', { chainId: this._chainIdStr });
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

  private async _genericConnectorRequest<T>(request: RequestArguments): Promise<T> {
    if (!this._connector) {
      throw standardErrors.provider.unauthorized(
        "Must select scw as connection type and call 'eth_requestAccounts' before other methods"
      );
    }

    if (this._connectionType === 'scw') {
      return await this._connector.request(request);
    }

    throw standardErrors.provider.disconnected({
      message: `Unsupported connection type: ${this._connectionType}`,
    });
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
      return Promise.resolve(this._accounts);
    }
    if (!this._connectionType) {
      await this._completeConnectionTypeSelection();
    }

    if (this._connectionType === 'scw') {
      this._initConnector();
      const ethAddresses = await this._connector?.handshake();
      if (Array.isArray(ethAddresses)) {
        this._setAccounts(ethAddresses);
        this._emitConnectEvent();
        return Promise.resolve(this._accounts);
      }
      return Promise.reject(new Error('No eth addresses found'));
    } else if (this._connectionType === 'walletlink') {
      // TODO: walletlink
      // do we need to do anything here? Currently we're just waiting for
      // a walletlinkQRCodeUrl request from the popup, then waiting for a scan
      // TODO: handle user goback/cancel
    } else if (this._connectionType === 'extension') {
      // TODO: persist selection and use it for future requests
      const extension = window.coinbaseWalletExtension;
      if (!extension) {
        throw new Error('Coinbase Wallet Extension not found');
      }
      const response = await extension.request({ method: 'eth_requestAccounts' });
      if (Array.isArray(response)) {
        this._setAccounts(response);
        this._emitConnectEvent();
        return Promise.resolve(this._accounts);
      }
      return Promise.reject(new Error('No eth addresses found'));
    }

    // if type unhandled reject for now
    return Promise.reject(`connectionType ${this._connectionType} not supported yet`);
  }

  private _setAccounts(accounts: AddressString[]) {
    if (areAddressArraysEqual(this._accounts, accounts)) {
      return;
    }

    this._accounts = accounts;
    this._setStoredAccounts(accounts);
    this.emit('accountsChanged', this._accounts);
  }

  // getWalletLinkUrl is be called by the popup communicator when
  // it receives message.type === 'wlQRCodeUrl' from the popup
  private getWalletLinkUrl() {
    this.initWalletLinkConnector();

    if (!(this._connector instanceof WalletLinkConnector)) {
      throw new Error('Connector not initialized or Connector.getWalletLinkUrl not defined');
    }
    return this._connector.legacyRelay.getQRCodeUrl();
  }

  private async _completeConnectionTypeSelection() {
    this._popupCommunicator.setWLQRCodeUrlCallback(this.getWalletLinkUrl);
    await this._popupCommunicator.connect();
    const connectionType = await this._popupCommunicator.selectConnectionType();
    if (connectionType !== 'scw') {
      throw new Error(`Unsupported connection type: ${connectionType}`);
    }
    this._connectionType = connectionType;
    this._storage.setItem(CONNECTION_TYPE_KEY, this._connectionType);
  }

  // storage methods
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
