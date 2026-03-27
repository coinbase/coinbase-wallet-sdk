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
import {
  logEnableFunctionCalled,
  logRequestError,
  logRequestResponded,
  logRequestStarted,
  logSignerLoadedFromStorage,
} from ':core/telemetry/events/provider.js';
import {
  logSignerSelectionRequested,
  logSignerSelectionResponded,
} from ':core/telemetry/events/signer-selection.js';
import { hexStringFromNumber } from ':core/type/util.js';
import { correlationIds } from ':store/correlation-ids/store.js';
import { store } from ':store/store.js';
import { checkErrorForInvalidRequestArgs, fetchRPCRequest } from ':util/provider.js';
import { Signer } from './sign/interface.js';
import {
  createSigner,
  fetchSignerType,
  loadSignerType,
  signerToSignerType,
  storeSignerType,
} from './sign/util.js';

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
      logSignerLoadedFromStorage({ signerType });
    }
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    // correlation id across the entire request lifecycle
    const correlationId = crypto.randomUUID();
    correlationIds.set(args, correlationId);
    logRequestStarted({ method: args.method, correlationId });

    try {
      const result = await this._request(args);
      logRequestResponded({
        method: args.method,
        signerType: signerToSignerType(this.signer),
        correlationId,
      });
      return result as T;
    } catch (error) {
      logRequestError({
        method: args.method,
        correlationId,
        signerType: signerToSignerType(this.signer),
        errorMessage: error instanceof Error ? error.message : '',
      });
      throw error;
    } finally {
      correlationIds.delete(args);
    }
  }

  private async _request<T>(args: RequestArguments): Promise<T> {
    try {
      checkErrorForInvalidRequestArgs(args);
      if (!this.signer) {
        switch (args.method) {
          case 'eth_requestAccounts': {
            let signerType: SignerType;

            const subAccountsConfig = store.subAccountsConfig.get();
            if (subAccountsConfig?.enableAutoSubAccounts) {
              signerType = 'scw';
            } else {
              signerType = await this.requestSignerSelection(args);
            }
            const signer = this.initSigner(signerType);

            if (signerType === 'scw' && subAccountsConfig?.enableAutoSubAccounts) {
              await signer.handshake({ method: 'handshake' });
              // eth_requestAccounts gets translated to wallet_connect at SCWSigner level
              await signer.request(args);
            } else {
              await signer.handshake(args);
            }

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
          case 'wallet_sendCalls':
          case 'wallet_sign': {
            const ephemeralSigner = this.initSigner('scw');
            await ephemeralSigner.handshake({ method: 'handshake' }); // exchange session keys
            const result = await ephemeralSigner.request(args); // send diffie-hellman encrypted request
            await ephemeralSigner.cleanup(); // clean up (rotate) the ephemeral session keys
            return result as T;
          }
          case 'wallet_getCallsStatus': {
            const result = await fetchRPCRequest(args, CB_WALLET_RPC_URL);
            return result as T;
          }
          case 'net_version': {
            const result = 1 as T; // default value
            return result;
          }
          case 'eth_chainId': {
            const result = hexStringFromNumber(1) as T; // default value
            return result;
          }
          default: {
            throw standardErrors.provider.unauthorized(
              "Must call 'eth_requestAccounts' before other methods"
            );
          }
        }
      }
      const result = await this.signer.request(args);
      return result as T;
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
    logEnableFunctionCalled();
    return await this.request({
      method: 'eth_requestAccounts',
    });
  }

  async disconnect() {
    await this.signer?.cleanup();
    this.signer = null;
    ScopedLocalStorage.clearAll();
    correlationIds.clear();
    this.emit('disconnect', standardErrors.provider.disconnected('User initiated disconnection'));
  }

  readonly isCoinbaseWallet = true;

  private async requestSignerSelection(handshakeRequest: RequestArguments): Promise<SignerType> {
    logSignerSelectionRequested();
    const signerType = await fetchSignerType({
      communicator: this.communicator,
      preference: this.preference,
      metadata: this.metadata,
      handshakeRequest,
      callback: this.emit.bind(this),
    });
    logSignerSelectionResponded(signerType);
    return signerType;
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
