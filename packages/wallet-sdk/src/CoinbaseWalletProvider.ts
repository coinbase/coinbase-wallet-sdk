import EventEmitter from 'eventemitter3';

import { standardErrorCodes, standardErrors } from './core/error';
import { ConstructorOptions, ProviderInterface, RequestArguments } from './core/provider/interface';
import { checkErrorForInvalidRequestArgs, fetchRPCRequest } from './core/provider/util';
import { AddressString, Chain } from './core/type';
import { areAddressArraysEqual, prepend0x, showDeprecationWarning } from './core/util';
import { AccountsUpdate, ChainUpdate } from './sign/interface';
import { SignHandler } from './sign/SignHandler';
import { FilterPolyfill } from './vendor-js/filter/FilterPolyfill';
import { determineMethodCategory } from ':core/provider/method';

export class CoinbaseWalletProvider extends EventEmitter implements ProviderInterface {
  protected accounts: AddressString[] = [];
  protected chain: Chain;
  protected signHandler: SignHandler;
  private filterHandler: FilterPolyfill;

  constructor(params: Readonly<ConstructorOptions>) {
    super();
    this.chain = {
      id: params.metadata.appChainIds?.[0] ?? 1,
    };
    this.signHandler = new SignHandler({
      ...params,
      listener: this.updateListener,
    });
    this.filterHandler = new FilterPolyfill(this.handlers.fetch);
  }

  public get connected() {
    return this.accounts.length > 0;
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    const invalidArgsError = checkErrorForInvalidRequestArgs(args);
    if (invalidArgsError) throw invalidArgsError;
    // unrecognized methods are treated as fetch requests
    const category = determineMethodCategory(args.method) ?? 'fetch';
    return this.handlers[category](args) as T;
  }

  protected readonly handlers = {
    // eth_requestAccounts
    handshake: async (_: RequestArguments): Promise<AddressString[]> => {
      if (this.connected) {
        return this.accounts;
      }
      try {
        const accounts = await this.signHandler.handshake();
        this.emit('connect', { chainId: prepend0x(this.chain.id.toString(16)) });
        return accounts;
      } catch (error) {
        this.handleUnauthorizedError(error);
        throw error;
      }
    },

    sign: async (request: RequestArguments) => {
      if (!this.connected) {
        throw standardErrors.provider.unauthorized(
          "Must call 'eth_requestAccounts' before other methods"
        );
      }
      try {
        return await this.signHandler.request(request);
      } catch (error) {
        this.handleUnauthorizedError(error);
        throw error;
      }
    },

    fetch: (request: RequestArguments) => fetchRPCRequest(request, this.chain),

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

    filter: (request: RequestArguments) => this.filterHandler.request(request),

    deprecated: ({ method }: RequestArguments) => {
      throw standardErrors.rpc.methodNotSupported(`Method ${method} is deprecated.`);
    },

    unsupported: ({ method }: RequestArguments) => {
      throw standardErrors.rpc.methodNotSupported(`Method ${method} is not supported.`);
    },
  };

  private handleUnauthorizedError(error: unknown) {
    const e = error as { code?: number };
    if (e.code === standardErrorCodes.provider.unauthorized) this.disconnect();
  }

  /** @deprecated Use `.request({ method: 'eth_requestAccounts' })` instead. */
  public async enable(): Promise<unknown> {
    showDeprecationWarning('enable', 'use request({ method: "eth_requestAccounts" })');
    return await this.request({
      method: 'eth_requestAccounts',
    });
  }

  async disconnect(): Promise<void> {
    this.accounts = [];
    this.chain = { id: 1 };
    this.signHandler.disconnect();
    this.emit('disconnect', standardErrors.provider.disconnected('User initiated disconnection'));
  }

  readonly isCoinbaseWallet = true;

  private readonly updateListener = {
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
  };
}
