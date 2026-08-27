import { RequestArguments } from ':core/provider/interface.js';
import { encrypt } from ':core/transport/crypto/index.js';
import { correlationIds } from ':store/correlation-ids/store.js';
import { decryptPopup } from './decrypt.js';
import { postPopup } from './post.js';
import type { PopupWire } from './types.js';

/**
 * Encrypted CAIP JSON-RPC to the popup (protocol v2).
 *
 * Seals `{ action: request }` with `encrypt` (shared with WalletLink 2.0),
 * posts ciphertext, and decrypts the reply. Chain targeting lives solely in
 * the CAIP-25/27 action.
 */
export async function send(wire: PopupWire, request: RequestArguments): Promise<unknown> {
  await wire.communicator.waitForPopupLoaded?.();
  const encrypted = await encrypt(wire.keys, { action: request });
  const response = await postPopup(wire, { encrypted }, correlationIds.get(request));
  const decrypted = await decryptPopup(wire, response);
  if ('error' in decrypted.result) throw decrypted.result.error;
  return decrypted.result.value;
}
