import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { serializeError } from ':core/error/serialize.js';
import { type Popup, createPopup } from ':core/popup/index.js';
import {
  ConstructorOptions,
  ProviderEventEmitter,
  ProviderInterface,
  RequestArguments,
} from ':core/provider/interface.js';
import { hexStringFromNumber } from ':core/type/util.js';
import { type StoreInstance, createStoreInstance } from ':store/store.js';
import { fetchRPCRequest } from ':util/provider.js';
import { withMeasurement } from './withMeasurement.js';

/**
 * One-shot payment provider: handshake → send → cleanup.
 * Uses an isolated in-memory store so it cannot share a session with the main provider.
 */
export class EphemeralBaseAccountProvider
  extends ProviderEventEmitter
  implements ProviderInterface
{
  private readonly runtime: Popup;
  private readonly ephemeralStore: StoreInstance;

  constructor(params: Readonly<ConstructorOptions>, runtime?: Popup) {
    super();
    const {
      metadata,
      preference: { walletUrl, ...preference },
    } = params;
    this.ephemeralStore = createStoreInstance({ persist: false });
    this.runtime =
      runtime ??
      createPopup({
        metadata,
        preference,
        walletUrl,
        storeInstance: this.ephemeralStore,
        emit: this.emit.bind(this),
      });
  }

  public request = withMeasurement(
    { isEphemeral: true },
    async <T>(args: RequestArguments): Promise<T> => {
      try {
        switch (args.method) {
          case 'wallet_sendCalls':
          case 'wallet_sign': {
            try {
              await this.runtime.handshake({ method: 'handshake' });
              return (await this.runtime.send(args)) as T;
            } finally {
              await this.runtime.cleanup();
            }
          }
          case 'wallet_getCallsStatus':
            return (await fetchRPCRequest(args, CB_WALLET_RPC_URL)) as T;
          case 'eth_accounts':
            return [] as T;
          case 'net_version':
            return 1 as T;
          case 'eth_chainId':
            return hexStringFromNumber(1) as T;
          default:
            throw standardErrors.provider.unauthorized(
              `Method '${args.method}' is not supported by ephemeral provider. Ephemeral providers only support: wallet_sendCalls, wallet_sign, wallet_getCallsStatus`
            );
        }
      } catch (error) {
        const { code } = error as { code?: number };
        if (code === standardErrorCodes.provider.unauthorized) {
          await this.disconnect();
        }
        return Promise.reject(serializeError(error));
      }
    }
  );

  async disconnect() {
    await this.runtime.cleanup();
    this.emit('disconnect', standardErrors.provider.disconnected('User initiated disconnection'));
  }

  readonly isBaseAccount = true;
}
