import {
  type Surface,
  logRequestError,
  logRequestResponded,
  logRequestStarted,
} from ':core/telemetry/events/provider.js';
import { parseErrorCodeFromAny, parseErrorMessageFromAny } from ':core/telemetry/utils.js';
import type { WalletTransport } from ':core/transport/index.js';

/**
 * Measure one dapp request: log `provider.request.started`, then `.responded` or `.error`.
 *
 * `handle` gets `measuredTransport`, the same transport except that every message it sends
 * carries this request's correlation id, so the wallet's logs line up with these events. Use it
 * instead of `transport` for the whole request.
 */
export async function withMeasurement<Result>(
  { surface, method, transport }: { surface: Surface; method: string; transport: WalletTransport },
  handle: (measuredTransport: WalletTransport) => Promise<Result>
): Promise<Result> {
  const correlationId = crypto.randomUUID();
  const measuredTransport: WalletTransport = {
    ...transport,
    handshake: (args) => transport.handshake(args, correlationId),
    request: (request) => transport.request(request, correlationId),
  };

  const event = { surface, method, correlationId };
  logRequestStarted(event);
  try {
    const result = await handle(measuredTransport);
    logRequestResponded(event);
    return result;
  } catch (error) {
    logRequestError({
      ...event,
      errorCode: parseErrorCodeFromAny(error),
      errorMessage: parseErrorMessageFromAny(error),
    });
    throw error;
  }
}
