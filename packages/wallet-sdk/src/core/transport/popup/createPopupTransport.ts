import type { RPCResponse } from ':core/message/RPCResponse.js';
import { logWalletRequestCompleted, logWalletRequestError } from ':core/telemetry/events/wallet.js';
import { parseErrorCodeFromAny, parseErrorMessageFromAny } from ':core/telemetry/utils.js';
import { KeyManager } from ':core/transport/crypto/index.js';
import type { KeyStore } from ':core/transport/crypto/KeyManager.js';
import { Communicator } from ':core/transport/popup/Communicator.js';
import { handshake } from ':core/transport/popup/handshake.js';
import { send } from ':core/transport/popup/send.js';
import type { PopupWire } from ':core/transport/popup/types.js';
import type { OpenFn } from ':util/web.js';
import type { Session } from '../../../storage/schema.js';
import type { AppMetadata, Preference } from '../../../storage/schema.js';
import type { WalletTransport } from '../types.js';

type SessionStore = {
  get: () => Session | undefined;
  set: (session: Session) => void;
  clear: () => void;
};

/**
 * Compose the shared transport over today's popup delivery implementation.
 *
 * Construction is inert: the communicator opens a popup only on handshake or request.
 */
export function createPopupTransport(opts: {
  metadata: AppMetadata;
  preference: Preference;
  keys: KeyStore;
  session: SessionStore;
  openFn?: OpenFn;
}): WalletTransport {
  const { walletUrl, ...preference } = opts.preference;
  const keys = new KeyManager(opts.keys);
  const wire: PopupWire = {
    keys,
    communicator: new Communicator({
      url: walletUrl,
      openFn: opts.openFn,
      metadata: opts.metadata,
      preference,
    }),
  };

  /** Post one message to the wallet, unwrap its answer, and log how the wallet answered. */
  const exchange = async (
    { method, correlationId }: { method: string; correlationId: string | undefined },
    post: () => Promise<RPCResponse>
  ): Promise<unknown> => {
    try {
      const response = await post();
      if ('error' in response.result) throw response.result.error;
      logWalletRequestCompleted({ method, correlationId });
      return response.result.value;
    } catch (error) {
      logWalletRequestError({
        method,
        correlationId,
        errorCode: parseErrorCodeFromAny(error),
        errorMessage: parseErrorMessageFromAny(error),
      });
      throw error;
    }
  };

  return {
    handshake: async (args, correlationId) => {
      await exchange({ method: 'handshake', correlationId }, () =>
        handshake(wire, args, correlationId)
      );
    },
    request: (request, correlationId) =>
      exchange({ method: request.method, correlationId }, () => send(wire, request, correlationId)),
    readSession: () => opts.session.get(),
    writeSession: (session) => opts.session.set(session),
    cleanup: async () => {
      await keys.clear();
      opts.session.clear();
    },
  };
}
