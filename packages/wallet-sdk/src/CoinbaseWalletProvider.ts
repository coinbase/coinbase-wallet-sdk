/* eslint-disable jest/no-commented-out-tests */
import EventEmitter from 'eventemitter3';

import { getErrorForInvalidRequestArgs } from './core/eip1193Utils';
import { standardErrors } from './core/error';
import { AddressString, Chain } from './core/type';
import {
  ProviderInterface,
  ProviderRpcError,
  RequestArguments,
} from './core/type/ProviderInterface';
import { RequestHandler } from './core/type/RequestHandlerInterface';
import { areAddressArraysEqual, prepend0x, showDeprecationWarning } from './core/util';
import { FilterRequestHandler } from './filter/FilterRequestHandler';
import { StateRequestHandler } from './internalState/StateRequestHandler';
import { RPCFetchRequestHandler } from './rpcFetch/RPCFetchRequestHandler';
import { SignRequestHandler } from './sign/SignRequestHandler';
import { AccountsUpdate, ChainUpdate } from './sign/UpdateListenerInterface';
import { SubscriptionRequestHandler } from './subscription/SubscriptionRequestHandler';
import { ConnectionPreference } from ':core/communicator/ConnectionPreference';

interface ConstructorOptions {
  scwUrl?: string;
  appName: string;
  appLogoUrl?: string | null;
  appChainIds: number[];
  connectionPreference: ConnectionPreference;
}

export class CoinbaseWalletProvider extends EventEmitter implements ProviderInterface {
  private accounts: AddressString[] = [];
  private chain: Chain;

  private readonly handlers: RequestHandler[];

  public get chainId() {
    return this.chain.id;
  }

  constructor(options: Readonly<ConstructorOptions>) {
    super();

    this.chain = {
      id: options.appChainIds?.[0] ?? 1,
    };

    this.handlers = [
      new StateRequestHandler(),
      new SignRequestHandler({
        ...options,
        updateListener: {
          onAccountsUpdate: this.setAccounts.bind(this),
          onChainUpdate: this.setChain.bind(this),
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
      new RPCFetchRequestHandler(), // should be last
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

  /** @deprecated Use `.request({ method: 'eth_requestAccounts' })` instead. */
  public async enable(): Promise<unknown> {
    showDeprecationWarning('enable', 'use request({ method: "eth_requestAccounts" })');
    return await this.request({
      method: 'eth_requestAccounts',
    });
  }

  private emitConnectEvent() {
    this.emit('connect', { chainId: prepend0x(this.chain.id.toString(16)) });
  }

  private setAccounts({ accounts, source }: AccountsUpdate) {
    if (areAddressArraysEqual(this.accounts, accounts)) {
      return;
    }

    this.accounts = accounts;

    if (source === 'storage') return;
    this.emit('accountsChanged', this.accounts);
  }

  private setChain({ chain, source }: ChainUpdate) {
    if (chain.id === this.chain.id && chain.rpcUrl === this.chain.rpcUrl) return;

    this.chain = chain;

    if (source === 'storage') return;
    this.emit('chainChanged', prepend0x(chain.id.toString(16)));
  }
}
