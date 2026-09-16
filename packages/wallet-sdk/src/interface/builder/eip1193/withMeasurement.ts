import { RequestArguments } from ':core/provider/interface.js';
import {
  logRequestError,
  logRequestResponded,
  logRequestStarted,
} from ':core/telemetry/events/provider.js';
import { parseErrorMessageFromAny } from ':core/telemetry/utils.js';
import { correlationIds } from ':store/correlation-ids/store.js';

type WithMeasurementOptions = {
  isEphemeral?: boolean;
};

/**
 * Higher-order function that wraps a request handler with correlation ID tracking and telemetry.
 *
 * Handles:
 * - Generating and storing correlation ID
 * - Logging request start/success/error
 * - Cleaning up correlation ID after request completes
 *
 * @param handler - The actual request handler function
 * @returns Wrapped handler with measurement instrumentation
 */
export function withMeasurement(
  options: WithMeasurementOptions,
  handler: <T>(args: RequestArguments) => Promise<T>
): <T>(args: RequestArguments) => Promise<T> {
  return async <T>(args: RequestArguments): Promise<T> => {
    const correlationId = crypto.randomUUID();
    correlationIds.set(args, correlationId);

    const measurementParams = {
      method: args.method,
      correlationId,
      isEphemeral: !!options.isEphemeral,
    };
    logRequestStarted(measurementParams);

    try {
      const result = await handler<T>(args);
      logRequestResponded(measurementParams);
      return result;
    } catch (error) {
      logRequestError({
        ...measurementParams,
        errorMessage: parseErrorMessageFromAny(error),
      });
      throw error;
    } finally {
      correlationIds.delete(args);
    }
  };
}
