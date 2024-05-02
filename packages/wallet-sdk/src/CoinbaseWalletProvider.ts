import EventEmitter from 'eventemitter3';

import { standardErrorCodes, standardErrors } from './core/error';
import { ConstructorOptions, ProviderInterface, RequestArguments } from './core/provider/interface';
import { AddressString, Chain, IntNumber } from './core/type';
import { areAddressArraysEqual, hexStringFromIntNumber } from './core/type/util';
import { AccountsUpdate, ChainUpdate } from './sign/interface';
import { SignHandler } from './sign/SignHandler';
import { checkErrorForInvalidRequestArgs, fetchRPCRequest } from './util/provider';
import { determineMethodCategory } from ':core/provider/method';

export class CoinbaseWalletProvider extends SignHandler implements ProviderInterface {
  private accounts: AddressString[] = [];
  private chain: Chain;
  private eventEmitter: EventEmitter;

  constructor(params: Readonly<ConstructorOptions>) {
    super(params);
    this.chain = {
      id: params.metadata.appChainIds?.[0] ?? 1,
    };
    this.eventEmitter = new EventEmitter();
    this.loadSigner();
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    const invalidArgsError = checkErrorForInvalidRequestArgs(args);
    if (invalidArgsError) throw invalidArgsError;
    // unrecognized methods are treated as fetch requests
    const category = determineMethodCategory(args.method) ?? 'fetch';
    return this.handlers[category](args) as T;
  }

  private readonly handlers = {
    // eth_requestAccounts
    handshake: async (_: RequestArguments): Promise<AddressString[]> => {
      try {
        const accounts = this.connected // already connected
          ? this.accounts
          : await this.signHandshake();
        this.eventEmitter.emit('connect', {
          chainId: hexStringFromIntNumber(IntNumber(this.chain.id)),
        });
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
        return await this.signRequest(request);
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

    deprecated: ({ method }: RequestArguments) => {
      throw standardErrors.rpc.methodNotSupported(`Method ${method} is deprecated.`);
    },

    unsupported: ({ method }: RequestArguments) => {
      throw standardErrors.rpc.methodNotSupported(`Method ${method} is not supported.`);
    },
  };

  async disconnect(): Promise<void> {
    super.disconnect();
    this.accounts = [];
    this.chain = { id: 1 };
    this.eventEmitter.emit(
      'disconnect',
      standardErrors.provider.disconnected('User initiated disconnection')
    );
  }

  public on<T>(event: string, listener: (_: T) => void) {
    return this.eventEmitter.on(event, listener);
  }

  /** @deprecated Use `.request({ method: 'eth_requestAccounts' })` instead. */
  public async enable(): Promise<unknown> {
    console.warn(
      `.enable() has been deprecated. Please use .request({ method: "eth_requestAccounts" }) instead.`
    );
    return await this.request({
      method: 'eth_requestAccounts',
    });
  }

  public readonly isCoinbaseWallet = true;

  public get connected() {
    return this.accounts.length > 0;
  }

  protected readonly stateUpdateListener = {
    onAccountsUpdate: ({ accounts, source }: AccountsUpdate) => {
      if (areAddressArraysEqual(this.accounts, accounts)) return;
      this.accounts = accounts;
      if (source === 'storage') return;
      this.eventEmitter.emit('accountsChanged', this.accounts);
    },
    onChainUpdate: ({ chain, source }: ChainUpdate) => {
      if (chain.id === this.chain.id && chain.rpcUrl === this.chain.rpcUrl) return;
      this.chain = chain;
      if (source === 'storage') return;
      this.eventEmitter.emit('chainChanged', hexStringFromIntNumber(IntNumber(chain.id)));
    },
  };

  private handleUnauthorizedError(error: unknown) {
    const e = error as { code?: number };
    if (e.code === standardErrorCodes.provider.unauthorized) this.disconnect();
  }
}
