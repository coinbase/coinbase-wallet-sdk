import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { serializeError } from ':core/error/serialize.js';
import { handleEip1193Request } from ':core/interfaces/eip1193/request.js';
import {
  ConstructorOptions,
  ProviderEventEmitter,
  ProviderInterface,
  RequestArguments,
} from ':core/provider/interface.js';
import { type WalletRuntime, createPopup } from ':core/transport/index.js';
import { correlationIds } from ':store/correlation-ids/store.js';
import { checkErrorForInvalidRequestArgs } from ':util/provider.js';
import { assertEphemeralMethod, createEphemeralStore } from './ephemeral.js';
import { withMeasurement } from './withMeasurement.js';

export type BaseAccountProviderParams = Readonly<ConstructorOptions> & {
  /**
   * Isolated in-memory store; cannot pair. `pay()` uses this so it does not
   * share Session / ECDH keys with `createBaseAccountSDK`.
   */
  ephemeral?: boolean;
};

/** EIP-1193 shell. Validates args, then `handleEip1193Request` (pair / invoke). */
export class BaseAccountProvider extends ProviderEventEmitter implements ProviderInterface {
  private readonly runtime: WalletRuntime;
  private readonly ephemeral: boolean;
  public readonly request: ProviderInterface['request'];

  constructor(params: BaseAccountProviderParams, runtime?: WalletRuntime) {
    super();
    const {
      ephemeral = false,
      metadata,
      preference: { walletUrl, ...preference },
    } = params;
    this.ephemeral = ephemeral;
    this.runtime =
      runtime ??
      createPopup({
        metadata,
        preference,
        walletUrl,
        emit: this.emit.bind(this),
        ...(ephemeral ? { storeInstance: createEphemeralStore() } : {}),
      });

    this.request = withMeasurement({ isEphemeral: ephemeral }, this.handleRequest);
  }

  private handleRequest = async <T>(args: RequestArguments): Promise<T> => {
    try {
      checkErrorForInvalidRequestArgs(args);
      if (this.ephemeral) assertEphemeralMethod(args.method);
      return (await handleEip1193Request(this.runtime, args)) as T;
    } catch (error) {
      const { code } = error as { code?: number };
      if (code === standardErrorCodes.provider.unauthorized) {
        await this.disconnect();
      }
      return Promise.reject(serializeError(error));
    }
  };

  async disconnect() {
    await this.runtime.cleanup();
    correlationIds.clear();
    this.emit('disconnect', standardErrors.provider.disconnected('User initiated disconnection'));
  }

  readonly isBaseAccount = true;
}
