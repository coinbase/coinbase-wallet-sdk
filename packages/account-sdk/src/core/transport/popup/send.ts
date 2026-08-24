import { RequestArguments } from ':core/provider/interface.js';
import { encrypt } from ':core/transport/crypto/index.js';
import { correlationIds } from ':store/correlation-ids/store.js';
import { decryptPopup } from './decrypt.js';
import { postPopup } from './post.js';
import type { PopupWire } from './types.js';

/**
 * Encrypted JSON-RPC to the popup (keys protocol v1).
 *
 * Seals `{ action: request, chainId }` with `encrypt` (shared with WalletLink
 * 2.0), posts ciphertext, decrypts the reply. Used by `WalletRuntime.send` and
 * by `transport.send` after `toLegacyRequest`.
 */
export async function send(wire: PopupWire, request: RequestArguments): Promise<unknown> {
  await wire.communicator.waitForPopupLoaded?.();
  const encrypted = await encrypt(wire.keys, { action: request, chainId: wire.chainId() });
  const response = await postPopup(wire, { encrypted }, correlationIds.get(request));
  const decrypted = await decryptPopup(wire, response);
  if ('error' in decrypted.result) throw decrypted.result.error;
  return decrypted.result.value;
}
