import { RequestArguments } from ':core/message/RequestArguments.js';
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
 * After this, popup requests can encrypt.
 */
export async function handshake(
  wire: PopupWire,
  args: RequestArguments = { method: 'handshake' },
  correlationId?: string
) {
  await wire.communicator.waitForPopupLoaded?.();
  const response = await postPopup(
    wire,
    { handshake: { method: args.method, params: args.params ?? [] } },
    correlationId
  );
  if ('failure' in response.content) throw response.content.failure;
  await wire.keys.setPeerPublicKeyFromHex(response.sender);
  const decrypted = await decryptPopup(wire, response);
  if ('error' in decrypted.result) throw decrypted.result.error;
  return decrypted;
}
