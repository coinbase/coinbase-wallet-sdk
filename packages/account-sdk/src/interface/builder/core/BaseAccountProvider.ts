import { handleEip1193Request } from ':core/adapter/eip1193.js';
import { type PopupRuntime, createPopupRuntime } from ':core/channel/index.js';
import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { serializeError } from ':core/error/serialize.js';
import {
  ConstructorOptions,
  ProviderEventEmitter,
  ProviderInterface,
  RequestArguments,
} from ':core/provider/interface.js';
import { correlationIds } from ':store/correlation-ids/store.js';
import { checkErrorForInvalidRequestArgs } from ':util/provider.js';
import { withMeasurement } from './withMeasurement.js';

/** EIP-1193 shell. `request` validates args then delegates to `handleEip1193Request`. */
export class BaseAccountProvider extends ProviderEventEmitter implements ProviderInterface {
  private readonly runtime: PopupRuntime;

  constructor(params: Readonly<ConstructorOptions>, runtime?: PopupRuntime) {
    super();
    const {
      metadata,
      preference: { walletUrl, ...preference },
    } = params;
    this.runtime =
      runtime ??
      createPopupRuntime({
        metadata,
        preference,
        walletUrl,
        emit: this.emit.bind(this),
      });
  }

  public request = withMeasurement(
    { isEphemeral: false },
    async <T>(args: RequestArguments): Promise<T> => {
      try {
        checkErrorForInvalidRequestArgs(args);
        return (await handleEip1193Request(this.runtime, args)) as T;
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
    correlationIds.clear();
    this.emit('disconnect', standardErrors.provider.disconnected('User initiated disconnection'));
  }

  readonly isBaseAccount = true;
}
