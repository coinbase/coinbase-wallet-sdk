import type { Communicator } from ':core/channel/Communicator.js';
import type { KeyManager } from ':core/channel/KeyManager.js';
import type { ProviderEventCallback, RequestArguments } from ':core/provider/interface.js';
import type { Channel, SessionData } from ':core/session/index.js';
import type { StoreHelpers } from ':store/store.js';

export type { StoreHelpers };

/** Communicator + KeyManager used by handshake/send. Do not persist `send`. */
export type PopupWire = {
  communicator: Pick<Communicator, 'postRequestAndWaitForResponse' | 'waitForPopupLoaded'>;
  keyManager: KeyManager;
  helpers: StoreHelpers;
  chainId: () => number;
};

/**
 * Live popup session used by the EIP-1193 shell: handshake, encrypted send, session read/write.
 * Created by `createPopupRuntime`. Never persist `send`.
 */
export type PopupRuntime = {
  helpers: StoreHelpers;
  emit?: ProviderEventCallback;
  chainId: () => number;
  handshake: (args?: RequestArguments) => Promise<void>;
  send: (request: RequestArguments) => Promise<unknown>;
  channel: Channel;
  readSession: () => SessionData | undefined;
  writeSession: (session: SessionData) => void;
  cleanup: () => Promise<void>;
};
