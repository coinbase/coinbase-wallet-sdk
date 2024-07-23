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

  public async request(args: RequestArguments): Promise<unknown> {
    try {
      checkErrorForInvalidRequestArgs(args);
      switch (args.method) {
        case 'eth_requestAccounts': {
          if (!this.signer) {
            const signerType = await this.requestSignerSelection();
            const signer = this.initSigner(signerType);
            await signer.handshake();
            this.signer = signer;
            storeSignerType(signerType, this.baseStorage);
          }
          this.emit('connect', { chainId: hexStringFromNumber(this.signer.chainId) });
          return this.signer.accounts;
        }

        case 'net_version':
          return this.signer?.chainId ?? 1;
        case 'eth_chainId':
          return hexStringFromNumber(this.signer?.chainId ?? 1);

        case 'eth_sign':
        case 'eth_signTypedData_v2':
        case 'eth_subscribe':
        case 'eth_unsubscribe':
          throw standardErrors.provider.unsupportedMethod();

        default: {
          if (!this.signer) {
            throw standardErrors.provider.unauthorized(
              "Must call 'eth_requestAccounts' before other methods"
            );
          }
          return this.signer.request(args);
        }
      }
    } catch (error) {
      const { code } = error as { code?: number };
      if (code === standardErrorCodes.provider.unauthorized) this.disconnect();
      return Promise.reject(serializeError(error));
    }
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
    this.signer = null;
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
      callback: (key, value) => {
        if (key === 'disconnect') {
          this.disconnect();
        } else {
          this.emit(key, value);
        }
      },
    });
  }
}
