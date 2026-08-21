import { AppMetadata, Preference, ProviderEventCallback } from ':core/provider/interface.js';
import { projectEthAccounts, sessionFromAccounts } from ':core/session/index.js';
import { toLegacyRequest } from ':core/translators/eip155/index.js';
import { KeyManager } from ':core/transport/crypto/index.js';
import { Communicator } from ':core/transport/popup/Communicator.js';
import type { WalletRuntime } from ':core/transport/types.js';
import { type StoreInstance, bindStore, defaultStoreInstance } from ':store/store.js';
import { handshake } from './handshake.js';
import { send } from './send.js';
import type { PopupWire } from './types.js';

/**
 * Build the popup `WalletRuntime` for one provider instance.
 *
 * Wires Communicator (postMessage) + KeyManager (ECDH) + session store.
 * `transport.send` strips CAIP then encrypts v1 RPC to keys.coinbase.com.
 * Pass `storeInstance` for an isolated in-memory store (`pay()`). WalletLink 2.0
 * should return the same `WalletRuntime` with a different delivery path. Do not
 * persist `send`.
 */
export function createPopup(opts: {
  metadata: AppMetadata;
  preference: Preference;
  walletUrl?: string;
  storeInstance?: StoreInstance;
  emit?: ProviderEventCallback;
}): WalletRuntime {
  const storeInstance = opts.storeInstance ?? defaultStoreInstance;
  const store = bindStore(storeInstance);

  // --- Shared crypto + popup delivery ---
  const keys = new KeyManager(storeInstance);
  const communicator = new Communicator({
    url: opts.walletUrl,
    metadata: opts.metadata,
    preference: opts.preference,
  });

  const chainId = () => store.account.get().chain?.id ?? opts.metadata.appChainIds?.[0] ?? 1;
  const wire: PopupWire = { communicator, keys, store, chainId };
  const sendRequest = (request: Parameters<WalletRuntime['send']>[0]) => send(wire, request);

  return {
    store,
    emit: opts.emit,
    chainId,
    handshake: (args) => handshake(wire, args),
    send: sendRequest,
    // Envelope path used by `invoke`: unwrap CAIP-27, then encrypted v1 JSON-RPC.
    transport: {
      kind: 'popup',
      send: (envelope) => sendRequest(toLegacyRequest(envelope)),
    },
    readSession: () => {
      const persisted = store.session.get();
      if (persisted && projectEthAccounts(persisted).length > 0) return persisted;
      // Hydrate from the legacy EIP-1193 account slice (pre-session store).
      const account = store.account.get();
      if (!account.accounts?.length) return undefined;
      return sessionFromAccounts({
        accounts: account.accounts,
        chainId: account.chain?.id ?? chainId(),
      });
    },
    writeSession: (session) => store.session.set(session),
    cleanup: async () => {
      await keys.clear();
      store.account.clear();
      store.session.clear();
      store.subAccounts.clear();
      store.spendPermissions.clear();
    },
  };
}
