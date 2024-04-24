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
import { AccountsUpdate, ChainUpdate } from './sign/interface';
import { determineMethodCategory } from ':core/provider/method';
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
      sign: this.handleInternalStateRequest.bind(this),
      state: this.handleInternalStateRequest.bind(this),
      filter: this.handleInternalStateRequest.bind(this),
      fetch: this.handleInternalStateRequest.bind(this),
      unsupported: this.handleUnsupportedMethod.bind(this),
      deprecated: this.handleUnsupportedMethod.bind(this),
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
    const category = determineMethodCategory(args.method);
    const handler = this.handlers[category] || this.handlers.unsupported;
    return handler(args) as T;
  }

  private handleInternalStateRequest(request: RequestArguments) {
    const getConnectedAccounts = (): AddressString[] => {
      if (this.connected) return this.accounts;
      throw standardErrors.provider.unauthorized(
        "Must call 'eth_requestAccounts' before other methods"
      );
    };
    switch (request.method) {
      case 'eth_chainId':
      case 'net_version':
        return this.chain.id;
      case 'eth_accounts':
        return getConnectedAccounts();
      case 'eth_coinbase':
        return getConnectedAccounts()[0];
      default:
        return this.handleUnsupportedMethod(request);
    }
  }

  private handleUnsupportedMethod(request: RequestArguments) {
    throw standardErrors.rpc.methodNotSupported(`Method ${request.method} is not supported.`);
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
    if (areAddressArraysEqual(this.accounts, accounts)) return;
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
