import { AppMetadata, Preference, ProviderEventCallback } from ':core/provider/interface.js';
import { createCaip27Request, projectEthAccounts } from ':core/session/index.js';
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
 * `transport.send` encrypts CAIP-27 RPC to keys.coinbase.com.
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
    // Envelope path used by `invoke`: encrypted CAIP-27 JSON-RPC.
    transport: {
      kind: 'popup',
      send: (envelope) => sendRequest(createCaip27Request(envelope)),
    },
    // The legacy account slice can exist without CAIP-25 authorization. Require
    // both the wallet-issued id and granted accounts before entering connected routing.
    // This SDK cache also does not prove SCW still persists the session; pair handles stale 4100.
    readSession: () => {
      const persisted = store.session.get();
      if (persisted?.sessionId && projectEthAccounts(persisted).length > 0) return persisted;
      return undefined;
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
