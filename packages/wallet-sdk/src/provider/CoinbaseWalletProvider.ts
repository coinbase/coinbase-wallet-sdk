/* eslint-disable jest/no-commented-out-tests */
import EventEmitter from 'eventemitter3';

import { ConnectionPreference } from '../CoinbaseWalletSDK';
import { Chain } from '../connector/ConnectorInterface';
import { standardErrors } from '../core/error';
import { AddressString } from '../core/type';
import { areAddressArraysEqual, prepend0x, showDeprecationWarning } from '../core/util';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { FilterRequestHandler } from './handler/FilterRequestHandler';
import { JSONRPCRequestHandler } from './handler/JSONRPCRequestHandler';
import { RequestHandler } from './handler/RequestHandler';
import {
  SignRequestHandler,
  SignRequestHandlingUpdateListener,
} from './handler/SignRequestHandler';
import { StateRequestHandler } from './handler/StateRequestHandler';
import { SubscriptionRequestHandler } from './handler/SubscriptionManager';
import { getErrorForInvalidRequestArgs } from './helpers/eip1193Utils';
import { ProviderInterface, ProviderRpcError, RequestArguments } from './ProviderInterface';

interface ConstructorOptions {
  storage: ScopedLocalStorage;
  scwUrl?: string;
  appName?: string;
  appLogoUrl?: string | null;
  appChainIds: number[];
  connectionPreference: ConnectionPreference;
}

const ACCOUNTS_KEY = 'Provider:accounts';
const CHAIN_KEY = 'Provider:chain';

export class CoinbaseWalletProvider
  extends EventEmitter
  implements ProviderInterface, SignRequestHandlingUpdateListener
{
  private _storage: ScopedLocalStorage;

  private _accounts: AddressString[];
  private _chain: Chain = {
    id: 1, // default to mainnet
  };

  private readonly handlers: RequestHandler[];

  constructor(options: Readonly<ConstructorOptions>) {
    super();
    this._storage = options.storage;

    const persistedAccounts = this._getStoredAccounts();
    this._accounts = persistedAccounts;
    const persistedChain = this._getStoredChain();
    this._chain = persistedChain;

    this.handlers = [
      new StateRequestHandler(),
      new SignRequestHandler({
        ...options,
        updateListener: this,
      }),
      new FilterRequestHandler({
        provider: this,
      }),
      new SubscriptionRequestHandler({
        provider: this,
      }),
      new JSONRPCRequestHandler(), // should be last
    ];
  }

  onAccountsChanged(_accounts: AddressString[]) {
    this._setAccounts(_accounts);
  }

  onChainChanged(chain: Chain): void {
    this._setChain(chain);
  }

  onConnect(): void {
    this._emitConnectEvent();
  }

  onResetConnection(): void {
    this.disconnect();
  }

  public get connected() {
    return this._accounts.length > 0;
  }

  async disconnect(): Promise<void> {
    const disconnectInfo: ProviderRpcError = standardErrors.provider.disconnected(
      'User initiated disconnection'
    );
    this._accounts = [];
    this._chain = { id: 1 };
    await Promise.all(
      this.handlers.map(async (handler) => {
        await handler.onDisconnect?.();
      })
    );
    this._storage.clear(); // clear persisted accounts & connectionType
    this.emit('disconnect', disconnectInfo);
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    const invalidArgsError = getErrorForInvalidRequestArgs(args);
    if (invalidArgsError) {
      throw invalidArgsError;
    }

    const handler = this.handlers.find((h) => h.canHandleRequest(args));
    return handler?.handleRequest(args, this._accounts, this._chain) as T;
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

  private _emitConnectEvent() {
    // https://eips.ethereum.org/EIPS/eip-1193#connect
    this.emit('connect', { chainId: prepend0x(this._chain.id.toString(16)) });
  }

  private _setAccounts(accounts: AddressString[]) {
    if (areAddressArraysEqual(this._accounts, accounts)) {
      return;
    }

    this._accounts = accounts;
    this._setStoredAccounts(accounts);
    this.emit('accountsChanged', this._accounts);
  }

  // storage methods
  private _setChain(chain: Chain) {
    if (chain.id === this._chain.id && chain.rpcUrl === this._chain.rpcUrl) return;
    this._chain = chain;
    this._storage.setItem(CHAIN_KEY, JSON.stringify(this._chain));
    this.emit('chainChanged', prepend0x(chain.id.toString(16)));
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
  private _getStoredChain(): Chain {
    const defaultChain = { id: 1 };
    try {
      const storedChain = this._storage.getItem(CHAIN_KEY);
      return storedChain ? JSON.parse(storedChain) : defaultChain;
    } catch (error) {
      // TODO: error handling
      console.error('Error retrieving accounts from storage:', error);
      return defaultChain;
    }
  }
}
