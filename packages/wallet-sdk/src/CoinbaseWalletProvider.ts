import { Signer } from './sign/interface.js';
import { createSigner, fetchSignerType, loadSignerType, storeSignerType } from './sign/util.js';
import { Communicator } from ':core/communicator/Communicator.js';
import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { serializeError } from ':core/error/serialize.js';
import { SignerType } from ':core/message/ConfigMessage.js';
import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  ProviderEventEmitter,
  ProviderInterface,
  RequestArguments,
} from ':core/provider/interface.js';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage.js';
import { hexStringFromNumber } from ':core/type/util.js';
import { checkErrorForInvalidRequestArgs, fetchRPCRequest } from ':util/provider.js';

export class CoinbaseWalletProvider extends ProviderEventEmitter implements ProviderInterface {
  private readonly metadata: AppMetadata;
  private readonly preference: Preference;
  private readonly communicator: Communicator;

  private signer: Signer | null = null;

  constructor({ metadata, preference: { keysUrl, ...preference } }: Readonly<ConstructorOptions>) {
    super();
    this.metadata = metadata;
    this.preference = preference;
    this.communicator = new Communicator({
      url: keysUrl,
      metadata,
      preference,
    });

    const signerType = loadSignerType();
    if (signerType) {
      this.signer = this.initSigner(signerType);
    }
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    try {
      checkErrorForInvalidRequestArgs(args);
      if (!this.signer) {
        switch (args.method) {
          case 'eth_requestAccounts': {
            const signerType = await this.requestSignerSelection(args);
            const signer = this.initSigner(signerType);
            await signer.handshake(args);
            this.signer = signer;
            storeSignerType(signerType);
            break;
          }
          case 'wallet_connect': {
            const signer = this.initSigner('scw');
            await signer.handshake({ method: 'handshake' }); // exchange session keys
            const result = await signer.request(args); // send diffie-hellman encrypted request
            this.signer = signer;
            return result as T;
          }
          case 'wallet_sendCalls': {
            const ephemeralSigner = this.initSigner('scw');
            await ephemeralSigner.handshake({ method: 'handshake' }); // exchange session keys
            const result = await ephemeralSigner.request(args); // send diffie-hellman encrypted request
            await ephemeralSigner.cleanup(); // clean up (rotate) the ephemeral session keys
            return result as T;
          }
          case 'wallet_getCallsStatus':
            return fetchRPCRequest(args, CB_WALLET_RPC_URL);
          case 'net_version':
            return 1 as T; // default value
          case 'eth_chainId':
            return hexStringFromNumber(1) as T; // default value
          default: {
            throw standardErrors.provider.unauthorized(
              "Must call 'eth_requestAccounts' before other methods"
            );
          }
        }
      }
      return await this.signer.request(args);
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
    await this.signer?.cleanup();
    this.signer = null;
    ScopedLocalStorage.clearAll();
    this.emit('disconnect', standardErrors.provider.disconnected('User initiated disconnection'));
  }

  readonly isCoinbaseWallet = true;

  private requestSignerSelection(handshakeRequest: RequestArguments): Promise<SignerType> {
    return fetchSignerType({
      communicator: this.communicator,
      preference: this.preference,
      metadata: this.metadata,
      handshakeRequest,
      callback: this.emit.bind(this),
    });
  }

  private initSigner(signerType: SignerType): Signer {
    return createSigner({
      signerType,
      metadata: this.metadata,
      communicator: this.communicator,
      callback: this.emit.bind(this),
    });
  }
}
