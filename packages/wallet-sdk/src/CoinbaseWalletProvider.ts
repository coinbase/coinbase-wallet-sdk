/* eslint-disable jest/no-commented-out-tests */
import EventEmitter from 'eventemitter3';

import { standardErrors } from './core/error';
import {
  ConstructorOptions,
  ProviderInterface,
  ProviderRpcError,
  RequestArguments,
} from './core/provider/interface';
import { checkErrorForInvalidRequestArgs, fetchRPCRequest } from './core/provider/util';
import { AddressString, Chain } from './core/type';
import { areAddressArraysEqual, prepend0x, showDeprecationWarning } from './core/util';
import { FilterRequestHandler } from './filter/FilterRequestHandler';
import { AccountsUpdate, ChainUpdate } from './sign/interface';
import { SignRequestHandler } from './sign/SignRequestHandler';
import { determineMethodCategory } from ':core/provider/method';

export class CoinbaseWalletProvider extends EventEmitter implements ProviderInterface {
  protected accounts: AddressString[] = [];
  protected chain: Chain;
  private readonly signRequestHandler: SignRequestHandler;

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
    const invalidArgsError = checkErrorForInvalidRequestArgs(args);
    if (invalidArgsError) throw invalidArgsError;
    // unrecognized methods are treated as fetch requests
    const category = determineMethodCategory(args.method) ?? 'fetch';
    return this.handlers[category](args) as T;
  }

  private readonly handlers = {
    fetch: (request: RequestArguments) => fetchRPCRequest(request, this.chain),

    sign: (request: RequestArguments) => {
      if (request.method === 'eth_requestAccounts') {
        if (this.connected) return this.accounts;
      } else if (!this.connected) {
        throw standardErrors.provider.unauthorized(
          "Must call 'eth_requestAccounts' before other methods"
        );
      }
      return this.signRequestHandler.handleRequest(request);
    },

    filter: (request: RequestArguments) => {
      const filterHandler = new FilterRequestHandler(this.handlers.fetch);
      return filterHandler.handleRequest(request);
    },

    state: (request: RequestArguments) => {
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
          return this.handlers.unsupported(request);
      }
    },

    deprecated: ({ method }: RequestArguments) => {
      standardErrors.rpc.methodNotSupported(`Method ${method} is deprecated for security reasons.`);
    },

    unsupported: ({ method }: RequestArguments) => {
      standardErrors.rpc.methodNotSupported(`Method ${method} is not supported.`);
    },
  };

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
