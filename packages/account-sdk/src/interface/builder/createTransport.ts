import type { ConstructorOptions } from ':core/provider/interface.js';
import { type WalletTransport, createPopupTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';

/** Create the SDK's shared popup transport. */
export function createTransport(
  options: Pick<ConstructorOptions, 'metadata' | 'preference'>,
  store: Pick<Store, 'keys' | 'session'>
): WalletTransport {
  return createPopupTransport({
    ...options,
    keys: store.keys,
    session: store.session,
  });
}
