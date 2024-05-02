import EventEmitter from 'eventemitter3';

import { AccountsUpdate, ChainUpdate, Signer } from './sign/interface';
import { SCWSigner } from './sign/scw/SCWSigner';
import { WLSigner } from './sign/walletlink/WLSigner';
import { PopupCommunicator } from ':core/communicator/Communicator';
import { standardErrorCodes, standardErrors } from ':core/error';
import { ConfigMessage, SignerType } from ':core/message';
import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  ProviderInterface,
  RequestArguments,
} from ':core/provider/interface';
import { determineMethodCategory } from ':core/provider/method';
import { AddressString, Chain, IntNumber } from ':core/type';
import { areAddressArraysEqual, hexStringFromIntNumber } from ':core/type/util';
import { checkErrorForInvalidRequestArgs, fetchRPCRequest } from ':util/provider';
import { ScopedLocalStorage } from ':util/ScopedLocalStorage';

const SIGNER_TYPE_KEY = 'SignerType';

export class CoinbaseWalletProvider implements ProviderInterface {
  readonly isCoinbaseWallet = true;

  accounts: AddressString[];
  chain: Chain;

  private signer: Signer | null;
  private readonly metadata: AppMetadata;
  private readonly preference: Preference;
  private readonly communicator: PopupCommunicator;
  private readonly storage = new ScopedLocalStorage('CBWSDK', 'SignerConfigurator');
  private readonly eventEmitter = new EventEmitter();

  constructor(params: Readonly<ConstructorOptions>) {
    const { keysUrl, ...preferenceWithoutKeysUrl } = params.preference;
    this.communicator = new PopupCommunicator(keysUrl);

    this.accounts = [];
    this.chain = {
      id: params.metadata.appChainIds?.[0] ?? 1,
    };

    this.preference = preferenceWithoutKeysUrl;
    this.metadata = params.metadata;
    this.signer = this.loadSigner();
  }

  get connected() {
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
      try {
        const accounts = await this._handshake();
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
      try {
        return await this._request(request);
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

  private handleUnauthorizedError(error: unknown) {
    const e = error as { code?: number };
    if (e.code === standardErrorCodes.provider.unauthorized) this.disconnect();
  }

  private async _handshake() {
    if (this.connected) return this.accounts;

    const signerType = await this.requestSignerSelection();
    const signer = this.initSigner(signerType);
    const accounts = await signer.handshake();

    this.storage.setItem(SIGNER_TYPE_KEY, signerType);
    this.signer = signer;

    return accounts;
  }

  private async _request(request: RequestArguments) {
    if (!this.signer) {
      throw new Error('Signer is not initialized');
    }
    if (!this.connected) {
      throw standardErrors.provider.unauthorized(
        "Must call 'eth_requestAccounts' before other methods"
      );
    }
    return this.signer.request(request);
  }

  disconnect() {
    this.accounts = [];
    this.chain = { id: 1 };

    this.signer?.disconnect();
    this.signer = null;
    this.storage.removeItem(SIGNER_TYPE_KEY);
    this.communicator.disconnect();

    this.eventEmitter.emit(
      'disconnect',
      standardErrors.provider.disconnected('User initiated disconnection')
    );
  }

  private loadSigner() {
    const signerType = this.storage.getItem(SIGNER_TYPE_KEY) as SignerType;
    return signerType ? this.initSigner(signerType) : null;
  }

  private async requestSignerSelection(): Promise<SignerType> {
    this.listenForWalletLinkSessionRequest();

    const request: ConfigMessage = {
      id: crypto.randomUUID(),
      event: 'selectSignerType',
      data: this.preference,
    };
    const { data } = await this.communicator.postMessage(request);
    return data as SignerType;
  }

  private initSigner(signerType: SignerType): Signer {
    if (signerType === 'walletlink' && this.walletlinkSigner) {
      return this.walletlinkSigner;
    }

    const SignerClasses = {
      scw: SCWSigner,
      walletlink: WLSigner,
      extension: undefined,
    };
    return new SignerClasses[signerType]!({
      metadata: this.metadata,
      postMessageToPopup: this.communicator.postMessage.bind(this),
      updateListener: this.updateListener,
    });
  }

  // temporary walletlink signer instance to handle WalletLinkSessionRequest
  // will revisit this when refactoring the walletlink signer
  private walletlinkSigner?: WLSigner;
  private listenForWalletLinkSessionRequest() {
    this.communicator
      .onMessage<ConfigMessage>(({ event }) => event === 'WalletLinkSessionRequest')
      .then(async () => {
        if (!this.walletlinkSigner) {
          this.walletlinkSigner = this.initSigner('walletlink') as WLSigner;
        }
        await this.walletlinkSigner.handleWalletLinkSessionRequest();
      });
  }

  protected readonly updateListener = {
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

  on<T>(event: string, listener: (_: T) => void): EventEmitter {
    return this.eventEmitter.on(event, listener);
  }

  /** @deprecated Use `.request({ method: 'eth_requestAccounts' })` instead. */
  async enable(): Promise<unknown> {
    console.warn(
      `.enable() has been deprecated. Please use .request({ method: "eth_requestAccounts" }) instead.`
    );
    return await this.request({
      method: 'eth_requestAccounts',
    });
  }
}
