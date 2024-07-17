import EventEmitter from 'eventemitter3';

import { standardErrorCodes, standardErrors } from './core/error';
import { serializeError } from './core/error/serialize';
import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  ProviderInterface,
  RequestArguments,
} from './core/provider/interface';
import { AddressString } from './core/type';
import { Signer } from './sign/interface';
import { createSigner, fetchSignerType, loadSignerType, storeSignerType } from './sign/util';
import { checkErrorForInvalidRequestArgs, fetchRPCRequest } from './util/provider';
import { Communicator } from ':core/communicator/Communicator';
import { SignerType } from ':core/message';
import { determineMethodCategory } from ':core/provider/method';
import { hexStringFromNumber } from ':core/type/util';
import type { BaseStorage } from ':util/BaseStorage';
import { ScopedStorage } from ':util/ScopedStorage';

export class CoinbaseWalletProvider extends EventEmitter implements ProviderInterface {
  private readonly metadata: AppMetadata;
  private readonly preference: Preference;
  private readonly communicator: Communicator;
  private readonly baseStorage?: BaseStorage;

  private signer: Signer | null;

  constructor({
    baseStorage,
    metadata,
    preference: { keysUrl, ...preference },
  }: Readonly<ConstructorOptions>) {
    super();
    this.baseStorage = baseStorage;
    this.metadata = metadata;
    this.preference = preference;
    this.communicator = new Communicator(keysUrl);
    // Load states from storage
    const signerType = loadSignerType(baseStorage);
    this.signer = signerType ? this.initSigner(signerType) : null;
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    try {
      checkErrorForInvalidRequestArgs(args);
      return (await this.handleRequest(args)) as T;
    } catch (error) {
      const { code } = error as { code?: number };
      if (code === standardErrorCodes.provider.unauthorized) this.disconnect();
      return Promise.reject(serializeError(error));
    }
  }

  protected async handleRequest(request: RequestArguments) {
    const category = determineMethodCategory(request.method) ?? 'fetch';
    return this.handlers[category](request);
  }

  protected readonly handlers = {
    // eth_requestAccounts
    handshake: async (_: RequestArguments) => {
      if (!this.signer) {
        const signerType = await this.requestSignerSelection();
        const signer = this.initSigner(signerType);
        await signer.handshake();
        this.signer = signer;
        storeSignerType(signerType, this.baseStorage);
      }
      this.emit('connect', { chainId: hexStringFromNumber(this.signer.chain.id) });
      return this.signer.accounts;
    },

    sign: async (request: RequestArguments) => {
      if (!this.signer) {
        throw standardErrors.provider.unauthorized(
          "Must call 'eth_requestAccounts' before other methods"
        );
      }
      return await this.signer.request(request);
    },

    fetch: (request: RequestArguments) => fetchRPCRequest(request, this.signer?.chain),

    state: (request: RequestArguments) => {
      const getConnectedAccounts = (): AddressString[] => {
        if (this.signer) return this.signer.accounts;
        throw standardErrors.provider.unauthorized(
          "Must call 'eth_requestAccounts' before other methods"
        );
      };
      switch (request.method) {
        case 'eth_chainId':
          return hexStringFromNumber(this.signer?.chain.id ?? 1);
        case 'net_version':
          return this.signer?.chain.id ?? 1; // default to mainnet
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

  /** @deprecated Use `.request({ method: 'eth_requestAccounts' })` instead. */
  public async enable() {
    console.warn(
      `.enable() has been deprecated. Please use .request({ method: "eth_requestAccounts" }) instead.`
    );
    return await this.request({
      method: 'eth_requestAccounts',
    });
  }

  async disconnect() {
    this.signer?.disconnect();
    ScopedStorage.clearAll(this.baseStorage);
    this.emit('disconnect', standardErrors.provider.disconnected('User initiated disconnection'));
  }

  readonly isCoinbaseWallet = true;

  private requestSignerSelection(): Promise<SignerType> {
    return fetchSignerType({
      communicator: this.communicator,
      preference: this.preference,
      metadata: this.metadata,
    });
  }

  private initSigner(signerType: SignerType): Signer {
    return createSigner({
      signerType,
      metadata: this.metadata,
      communicator: this.communicator,
      updateListener: {
        onAccountsUpdate: (accounts) => this.emit('accountsChanged', accounts),
        onChainIdUpdate: (id) => this.emit('chainChanged', hexStringFromNumber(id)),
      },
    });
  }
}
