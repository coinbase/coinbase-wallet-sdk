import type { Communicator } from ':core/popup/Communicator.js';
import type { PopupKeys } from ':core/popup/PopupKeys.js';
import type { ProviderEventCallback, RequestArguments } from ':core/provider/interface.js';
import type { Session, Transport } from ':core/session/index.js';
import type { StoreHelpers } from ':store/store.js';

export type { StoreHelpers };

/** Communicator + PopupKeys used by handshake/send. Do not persist `send`. */
export type PopupIO = {
  communicator: Pick<Communicator, 'postRequestAndWaitForResponse' | 'waitForPopupLoaded'>;
  keys: PopupKeys;
  helpers: StoreHelpers;
  chainId: () => number;
};

/**
 * Composition root: Communicator + PopupKeys + session read/write.
 * Created by `createPopup`. Do not persist `send`.
 */
export type Popup = {
  helpers: StoreHelpers;
  emit?: ProviderEventCallback;
  chainId: () => number;
  handshake: (args?: RequestArguments) => Promise<void>;
  send: (request: RequestArguments) => Promise<unknown>;
  transport: Transport;
  readSession: () => Session | undefined;
  writeSession: (session: Session) => void;
  cleanup: () => Promise<void>;
};
