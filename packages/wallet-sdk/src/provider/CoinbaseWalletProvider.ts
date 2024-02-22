/* eslint-disable jest/no-commented-out-tests */
import EventEmitter from 'eventemitter3';

import { ConnectionPreference } from '../CoinbaseWalletSDK';
import { standardErrors } from '../core/error';
import { AddressString, Chain } from '../core/type';
import { areAddressArraysEqual, prepend0x, showDeprecationWarning } from '../core/util';
import { FilterRequestHandler } from './handler/FilterRequestHandler';
import { JSONRPCRequestHandler } from './handler/JSONRPCRequestHandler';
import { RequestHandler } from './handler/RequestHandler';
import { SignRequestHandler } from './handler/SignRequestHandler';
import { StateRequestHandler } from './handler/StateRequestHandler';
import { SubscriptionRequestHandler } from './handler/SubscriptionManager';
import { getErrorForInvalidRequestArgs } from './helpers/eip1193Utils';
import { ProviderInterface, ProviderRpcError, RequestArguments } from './ProviderInterface';

interface ConstructorOptions {
  scwUrl?: string;
  appName?: string;
  appLogoUrl?: string | null;
  appChainIds: number[];
  connectionPreference: ConnectionPreference;
}

export class CoinbaseWalletProvider extends EventEmitter implements ProviderInterface {
  private accounts: AddressString[];
  private chain: Chain = {
    id: 1, // default to mainnet
  };

  private readonly handlers: RequestHandler[];

  constructor(options: Readonly<ConstructorOptions>) {
    super();

    // TODO!!!!!! implement load from storage
    this.accounts = [];

    this.handlers = [
      new StateRequestHandler(),
      new SignRequestHandler({
        ...options,
        updateListener: {
          onAccountsChanged: this.setAccounts.bind(this),
          onChainChanged: this.setChain.bind(this),
          onConnect: this.emitConnectEvent.bind(this),
          onResetConnection: this.disconnect.bind(this),
        },
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

  public get connected() {
    return this.accounts.length > 0;
  }

  async disconnect(): Promise<void> {
    const disconnectInfo: ProviderRpcError = standardErrors.provider.disconnected(
      'User initiated disconnection'
    );
    this.accounts = [];
    this.chain = { id: 1 };
    await Promise.all(
      this.handlers.map(async (handler) => {
        await handler.onDisconnect?.();
      })
    );
    this.emit('disconnect', disconnectInfo);
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    const invalidArgsError = getErrorForInvalidRequestArgs(args);
    if (invalidArgsError) {
      throw invalidArgsError;
    }

    const handler = this.handlers.find((h) => h.canHandleRequest(args));
    return handler?.handleRequest(args, this.accounts, this.chain) as T;
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

  private emitConnectEvent() {
    // https://eips.ethereum.org/EIPS/eip-1193#connect
    this.emit('connect', { chainId: prepend0x(this.chain.id.toString(16)) });
  }

  private setAccounts(accounts: AddressString[]) {
    if (areAddressArraysEqual(this.accounts, accounts)) {
      return;
    }

    this.accounts = accounts;
    this.emit('accountsChanged', this.accounts);
  }

  private setChain(chain: Chain) {
    if (chain.id === this.chain.id && chain.rpcUrl === this.chain.rpcUrl) return;
    this.chain = chain;
    this.emit('chainChanged', prepend0x(chain.id.toString(16)));
  }
}
