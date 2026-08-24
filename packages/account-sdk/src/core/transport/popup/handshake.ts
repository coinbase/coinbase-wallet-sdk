import { RequestArguments } from ':core/provider/interface.js';
import { correlationIds } from ':store/correlation-ids/store.js';
import { decryptPopup } from './decrypt.js';
import { postPopup } from './post.js';
import type { PopupWire } from './types.js';

/**
 * Popup handshake: plaintext key exchange, then decrypt the wallet's first reply.
 *
 * 1. Wait for the keys popup to load.
 * 2. Post `{ handshake }` with our public key in `sender` (not encrypted).
 * 3. Store the wallet's public key on `KeyManager` → derive shared secret.
 * 4. Decrypt the encrypted payload (chain list / capabilities) with that secret.
 *
 * After this, `send` can encrypt. WalletLink 2.0 should do 3–4 the same way
 * after its own delivery of the peer public key.
 */
export async function handshake(wire: PopupWire, args: RequestArguments = { method: 'handshake' }) {
  await wire.communicator.waitForPopupLoaded?.();
  const response = await postPopup(
    wire,
    { handshake: { method: args.method, params: args.params ?? [] } },
    correlationIds.get(args)
  );
  if ('failure' in response.content) throw response.content.failure;
  await wire.keys.setPeerPublicKeyFromHex(response.sender);
  const decrypted = await decryptPopup(wire, response);
  if ('error' in decrypted.result) throw decrypted.result.error;
}
