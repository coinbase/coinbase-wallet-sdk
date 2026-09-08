import type { RPCResponse } from ':core/message/RPCResponse.js';
import { KeyManager } from ':core/transport/crypto/index.js';
import type { KeyStore } from ':core/transport/crypto/KeyManager.js';
import { Communicator } from ':core/transport/popup/Communicator.js';
import { handshake } from ':core/transport/popup/handshake.js';
import { send } from ':core/transport/popup/send.js';
import type { PopupWire } from ':core/transport/popup/types.js';
import { correlationIds } from ':store/correlation-ids/store.js';
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
}): WalletTransport {
  const { walletUrl, ...preference } = opts.preference;
  const keys = new KeyManager(opts.keys);
  const wire: PopupWire = {
    keys,
    communicator: new Communicator({
      url: walletUrl,
      metadata: opts.metadata,
      preference,
    }),
  };
  const consume = (response: RPCResponse): unknown => {
    if ('error' in response.result) throw response.result.error;
    return response.result.value;
  };

  return {
    handshake: async (args) => {
      consume(await handshake(wire, args, args ? correlationIds.get(args) : undefined));
    },
    request: async (request) => consume(await send(wire, request, correlationIds.get(request))),
    readSession: () => opts.session.get(),
    writeSession: (session) => opts.session.set(session),
    cleanup: async () => {
      await keys.clear();
      opts.session.clear();
    },
  };
}
