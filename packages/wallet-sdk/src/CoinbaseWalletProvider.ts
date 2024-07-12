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
import { Signer } from './sign/interface';
import { createSigner, fetchSignerType, loadSignerType, storeSignerType } from './sign/util';
import { checkErrorForInvalidRequestArgs } from './util/provider';
import { Communicator } from ':core/communicator/Communicator';
import { SignerType } from ':core/message';
import { determineMethodCategory } from ':core/provider/method';
import { hexStringFromNumber } from ':core/type/util';
import { ScopedLocalStorage } from ':util/ScopedLocalStorage';

export class CoinbaseWalletProvider extends EventEmitter implements ProviderInterface {
  private readonly metadata: AppMetadata;
  private readonly preference: Preference;
  private readonly communicator: Communicator;

  private signer: Signer | null;

  constructor({ metadata, preference: { keysUrl, ...preference } }: Readonly<ConstructorOptions>) {
    super();
    this.metadata = metadata;
    this.preference = preference;
    this.communicator = new Communicator(keysUrl);
    // Load states from storage
    const signerType = loadSignerType();
    this.signer = signerType ? this.initSigner(signerType) : null;
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    try {
      checkErrorForInvalidRequestArgs(args);

      switch (determineMethodCategory(args.method)) {
        case 'handshake':
          return (await this.handshake()) as T;

        case 'unsupported':
        case 'deprecated':
          throw standardErrors.rpc.methodNotSupported(`Method ${args.method} is not supported.`);

        default:
          return (await this.handleRequest(args)) as T;
      }
    } catch (error) {
      const { code } = error as { code?: number };
      if (code === standardErrorCodes.provider.unauthorized) this.disconnect();
      return Promise.reject(serializeError(error));
    }
  }

  private async handshake() {
    if (!this.signer) {
      const signerType = await this.requestSignerSelection();
      const signer = this.initSigner(signerType);
      await signer.handshake();
      this.signer = signer;
      storeSignerType(signerType);
    }

    this.emit('connect', { chainId: hexStringFromNumber(this.signer.chainId) });
    return this.signer.accounts;
  }

  protected async handleRequest(request: RequestArguments) {
    if (!this.signer) {
      switch (request.method) {
        // if signer is not initialized, return chainId as 1 (mainnet)
        case 'eth_chainId':
          return hexStringFromNumber(1);
        case 'net_version':
          return 1;
        default:
          // for other methods, throw unauthorized error
          throw standardErrors.provider.unauthorized(
            "Must call 'eth_requestAccounts' before other methods"
          );
      }
    }

    return this.signer.request(request);
  }

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
    ScopedLocalStorage.clearAll();
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
