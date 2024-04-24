/* eslint-disable jest/no-commented-out-tests */
import EventEmitter from 'eventemitter3';

import { standardErrors } from './core/error';
import {
  ConstructorOptions,
  ProviderInterface,
  ProviderRpcError,
  RequestArguments,
} from './core/provider/interface';
import { getErrorForInvalidRequestArgs } from './core/provider/util';
import { AddressString, Chain } from './core/type';
import { areAddressArraysEqual, prepend0x, showDeprecationWarning } from './core/util';
import { FilterRequestHandler } from './filter/FilterRequestHandler';
import { StateRequestHandler } from './internalState/StateRequestHandler';
import { RPCFetchRequestHandler } from './rpcFetch/RPCFetchRequestHandler';
import { AccountsUpdate, ChainUpdate } from './sign/interface';
import { SignRequestHandler } from './sign/SignRequestHandler';
import { RequestHandler } from ':core/provider/RequestHandlerInterface';

export class CoinbaseWalletProvider extends EventEmitter implements ProviderInterface {
  protected accounts: AddressString[] = [];
  protected chain: Chain;

  protected readonly handlers;

  constructor(options: Readonly<ConstructorOptions>) {
    super();

    this.chain = {
      id: options.metadata.appChainIds?.[0] ?? 1,
    };

    this.handlers = {
      sign: new SignRequestHandler({
        ...options,
        updateListener: this.updateListener,
      }),
      state: new StateRequestHandler(),
      filter: new FilterRequestHandler({
        provider: this,
      }),
      fetch: new RPCFetchRequestHandler(),
      unsupported: new RPCFetchRequestHandler(),
      deprecated: new RPCFetchRequestHandler(),
    };
  }

  protected updateListener = {
    onAccountsUpdate: this.setAccounts.bind(this),
    onChainUpdate: this.setChain.bind(this),
    onConnect: this.emitConnectEvent.bind(this),
    onResetConnection: this.disconnect.bind(this),
  };

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
      Object.values(this.handlers).map(async (handler) => {
        await (handler as RequestHandler<any>).onDisconnect?.();
      })
    );
    this.emit('disconnect', disconnectInfo);
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    const invalidArgsError = getErrorForInvalidRequestArgs(args);
    if (invalidArgsError) {
      throw invalidArgsError;
    }

    const handler = Object.values(this.handlers).find((h) => h.canHandleRequest(args));
    return handler?.handleRequest(args, this.accounts, this.chain) as T;
  }

  /** @deprecated Use `.request({ method: 'eth_requestAccounts' })` instead. */
  public async enable(): Promise<unknown> {
    showDeprecationWarning('enable', 'use request({ method: "eth_requestAccounts" })');
    return await this.request({
      method: 'eth_requestAccounts',
    });
  }

  readonly isCoinbaseWallet = true;

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
