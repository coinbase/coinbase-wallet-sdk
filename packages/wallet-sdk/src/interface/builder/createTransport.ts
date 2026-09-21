import type { ConstructorOptions } from ':core/provider/interface.js';
import { type WalletTransport, createPopupTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import type { OpenFn } from ':util/web.js';

/** Create the SDK's shared popup transport. */
export function createTransport(
  options: Pick<ConstructorOptions, 'metadata' | 'preference'>,
  store: Pick<Store, 'keys' | 'session'>,
  openFn?: OpenFn
): WalletTransport {
  return createPopupTransport({
    ...options,
    openFn,
    keys: store.keys,
    session: store.session,
  });
}
