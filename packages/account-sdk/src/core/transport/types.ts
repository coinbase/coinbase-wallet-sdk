import type { ProviderEventCallback, RequestArguments } from ':core/provider/interface.js';
import type { Session, Transport } from ':core/session/index.js';
import type { Store } from ':store/store.js';

/**
 * Live wallet connection for this page. EIP-1193 handlers, `pair`, and
 * sub-account take this type — not a popup-specific object.
 *
 * Popup implements it via `createPopup`. WalletLink 2.0 implements the same
 * shape with a relay instead of `Communicator`.
 *
 * Contrast with `Session` (persisted noun) and `Transport` (just `{ kind, send }`).
 * This object also holds handshake, JSON-RPC `send`, the store, and session
 * read/write. Do not persist `send` or `handshake`.
 */
export type WalletRuntime = {
  /** Slice accessors: `store.account.get()`, `store.session.set()`, … */
  store: Store;
  /** EIP-1193 events (`accountsChanged`, `connect`, `chainChanged`, …). */
  emit?: ProviderEventCallback;
  /** Active eip155 chain id (store, else metadata `appChainIds[0]`, else 1). */
  chainId: () => number;
  /**
   * ECDH key exchange with the wallet. Must run before encrypted `send`.
   * Popup: postMessage handshake. WalletLink 2.0: same KeyManager, different I/O.
   */
  handshake: (args?: RequestArguments) => Promise<void>;
  /**
   * Encrypted JSON-RPC `{ method, params }` (keys protocol v1). Used by `pair`
   * for `wallet_connect`. Envelope traffic uses `transport.send` instead.
   */
  send: (request: RequestArguments) => Promise<unknown>;
  /** Envelope delivery used by `invoke`. Only `kind` is stored on the session. */
  transport: Transport;
  readSession: () => Session | undefined;
  writeSession: (session: Session) => void;
  /** Drop ECDH keys and account/session slices (disconnect / ephemeral). */
  cleanup: () => Promise<void>;
};
