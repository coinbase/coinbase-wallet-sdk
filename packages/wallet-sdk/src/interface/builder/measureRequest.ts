import {
  type Surface,
  logRequestError,
  logRequestResponded,
  logRequestStarted,
} from ':core/telemetry/events/provider.js';
import { logWalletRequestCompleted, logWalletRequestError } from ':core/telemetry/events/wallet.js';
import { parseErrorCodeFromAny, parseErrorMessageFromAny } from ':core/telemetry/utils.js';
import type { WalletTransport } from ':core/transport/index.js';

/**
 * Log how one wallet message ended. Its error can come back in the wallet's answer or be thrown
 * before any answer is read (a plaintext `failure`, a closed popup), so this wraps the whole
 * round trip.
 */
async function measureWalletRequest<T>(
  walletRequest: { method: string; correlationId: string },
  roundTrip: () => Promise<T>
): Promise<T> {
  try {
    const answer = await roundTrip();
    logWalletRequestCompleted(walletRequest);
    return answer;
  } catch (error) {
    logWalletRequestError({
      ...walletRequest,
      errorCode: parseErrorCodeFromAny(error),
      errorMessage: parseErrorMessageFromAny(error),
    });
    throw error;
  }
}

/**
 * Run one dapp request with telemetry: `provider.request.*` for the request, and
 * `wallet.request.*` for each wallet message it sends.
 *
 * Core builds those messages and only holds a transport, so `run` gets one made for this
 * request. It sends the request's correlation id with every message, so the wallet's logs join
 * the SDK's.
 */
export async function measureRequest<T>(
  { surface, method, transport }: { surface: Surface; method: string; transport: WalletTransport },
  run: (measured: WalletTransport) => Promise<T>
): Promise<T> {
  const correlationId = crypto.randomUUID();
  const measured: WalletTransport = {
    ...transport,
    handshake: (args) =>
      measureWalletRequest({ method: 'handshake', correlationId }, () =>
        transport.handshake(args, correlationId)
      ),
    request: (request) =>
      measureWalletRequest({ method: request.method, correlationId }, () =>
        transport.request(request, correlationId)
      ),
  };

  const measurement = { surface, method, correlationId };
  logRequestStarted(measurement);
  try {
    const result = await run(measured);
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
