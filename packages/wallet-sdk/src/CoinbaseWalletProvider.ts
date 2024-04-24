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
import { SignRequestHandler } from './sign/SignRequestHandler';
import { LIB_VERSION } from './version';
import { determineMethodCategory } from ':core/provider/method';

export class CoinbaseWalletProvider extends EventEmitter implements ProviderInterface {
  protected accounts: AddressString[] = [];
  protected chain: Chain;
  protected readonly signRequestHandler: SignRequestHandler;

  constructor(options: Readonly<ConstructorOptions>) {
    super();
    this.chain = {
      id: options.metadata.appChainIds?.[0] ?? 1,
    };
    this.signRequestHandler = new SignRequestHandler({
      ...options,
      updateListener: this.updateListener,
    });
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
    this.signRequestHandler.onDisconnect();
    this.emit('disconnect', disconnectInfo);
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    const invalidArgsError = getErrorForInvalidRequestArgs(args);
    if (invalidArgsError) {
      throw invalidArgsError;
    }

    const category = determineMethodCategory(args.method) ?? 'fetch';
    const handler = this.handlers[category];
    return handler(args);
  }

  private handlers = {
    fetch: this.handleRPCFetchRequest,
    sign: this.handleSignRequest,
    state: this.handleInternalStateRequest,
    filter: this.handleFilterRequest,
    deprecated: this.handleUnsupportedMethod,
    unsupported: this.handleUnsupportedMethod,
  };

  private async handleSignRequest<T>(request: RequestArguments): Promise<T> {
    return this.signRequestHandler.handleRequest(request, this.accounts) as T;
  }

  private async handleRPCFetchRequest(request: RequestArguments) {
    const rpcUrl = this.chain.rpcUrl;
    if (!rpcUrl) throw standardErrors.rpc.internal('No RPC URL set for chain');
    const requestBody = {
      ...request,
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
    };
    const res = await window.fetch(rpcUrl, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', 'X-Cbw-Sdk-Version': LIB_VERSION },
    });
    const response = await res.json();
    return response.result;
  }

  private async handleFilterRequest<T>(request: RequestArguments): Promise<T> {
    const rpcUrl = this.chain.rpcUrl;
    if (!rpcUrl) throw standardErrors.rpc.internal('No RPC URL set for chain');
    return fetchRequestHandler.handleRequest(request, rpcUrl);
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

  private updateListener = {
    onConnect: () => {
      this.emit('connect', { chainId: prepend0x(this.chain.id.toString(16)) });
    },
    onAccountsUpdate: ({ accounts, source }: AccountsUpdate) => {
      if (areAddressArraysEqual(this.accounts, accounts)) return;
      this.accounts = accounts;
      if (source === 'storage') return;
      this.emit('accountsChanged', this.accounts);
    },
    onChainUpdate: ({ chain, source }: ChainUpdate) => {
      if (chain.id === this.chain.id && chain.rpcUrl === this.chain.rpcUrl) return;
      this.chain = chain;
      if (source === 'storage') return;
      this.emit('chainChanged', prepend0x(chain.id.toString(16)));
    },
    onResetConnection: () => {
      this.disconnect();
    },
  };
}
