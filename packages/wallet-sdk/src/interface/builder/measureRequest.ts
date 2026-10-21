import {
  type Surface,
  logRequestError,
  logRequestResponded,
  logRequestStarted,
} from ':core/telemetry/events/provider.js';
import { parseErrorCodeFromAny, parseErrorMessageFromAny } from ':core/telemetry/utils.js';
import type { WalletTransport } from ':core/transport/index.js';

/**
 * Run one dapp request with `provider.request.*` telemetry.
 *
 * Core builds the wallet messages and only holds a transport, so `run` gets one made for this
 * request. It sends the request's correlation id with every message, so the wallet's logs join
 * the SDK's.
 */
export async function measureRequest<T>(
  { surface, method, transport }: { surface: Surface; method: string; transport: WalletTransport },
  run: (measured: WalletTransport) => Promise<T>
): Promise<T> {
  const measurement = { surface, method, correlationId: crypto.randomUUID() };
  logRequestStarted(measurement);
  try {
    const result = await run({
      ...transport,
      handshake: (args) => transport.handshake(args, measurement.correlationId),
      request: (request) => transport.request(request, measurement.correlationId),
    });
    logRequestResponded(measurement);
    return result;
  } catch (error) {
    logRequestError({
      ...measurement,
      errorCode: parseErrorCodeFromAny(error),
      errorMessage: parseErrorMessageFromAny(error),
    });
    throw error;
  }
}
