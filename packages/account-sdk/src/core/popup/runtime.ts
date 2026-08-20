import { toLegacyRequest } from ':core/namespaces/eip155/index.js';
import { Communicator } from ':core/popup/Communicator.js';
import { PopupKeys } from ':core/popup/PopupKeys.js';
import { AppMetadata, Preference, ProviderEventCallback } from ':core/provider/interface.js';
import { sessionFromAccounts } from ':core/session/index.js';
import { type StoreInstance, createStoreHelpers, sdkstore } from ':store/store.js';
import { handshake } from './handshake.js';
import { send } from './send.js';
import type { Popup, PopupIO } from './types.js';

/**
 * Build Communicator + PopupKeys + session helpers for one provider instance.
 *
 * Handshake/send encrypt through this popup. `transport.send` strips CAIP fields before
 * posting to keys.coinbase.com. The default store is the persisted SDK singleton;
 * ephemeral providers pass their own store. Do not persist `send`.
 */
export function createPopup(opts: {
  metadata: AppMetadata;
  preference: Preference;
  walletUrl?: string;
  storeInstance?: StoreInstance;
  emit?: ProviderEventCallback;
}): Popup {
  const storeInstance = opts.storeInstance ?? sdkstore;
  const helpers = createStoreHelpers(storeInstance);
  const keys = new PopupKeys(storeInstance);
  const communicator = new Communicator({
    url: opts.walletUrl,
    metadata: opts.metadata,
    preference: opts.preference,
  });

  const chainId = () => helpers.account.get().chain?.id ?? opts.metadata.appChainIds?.[0] ?? 1;

  const wire: PopupIO = { communicator, keys, helpers, chainId };

  const sendRequest = (request: Parameters<Popup['send']>[0]) => send(wire, request);

  return {
    helpers,
    emit: opts.emit,
    chainId,
    handshake: (args) => handshake(wire, args),
    send: sendRequest,
    transport: {
      kind: 'popup',
      send: (envelope) => sendRequest(toLegacyRequest(envelope)),
    },
    readSession: () => {
      const persisted = helpers.session.get();
      if (persisted) return persisted;
      const account = helpers.account.get();
      if (!account.accounts?.length) return undefined;
      return sessionFromAccounts({
        accounts: account.accounts,
        chainId: account.chain?.id ?? chainId(),
      });
    },
    writeSession: (session) => helpers.session.set(session),
    cleanup: async () => {
      await keys.clear();
      helpers.account.clear();
      helpers.session.clear();
      helpers.subAccounts.clear();
      helpers.spendPermissions.clear();
    },
  };
}
