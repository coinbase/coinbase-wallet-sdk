import { RequestArguments } from ':core/provider/interface.js';
import { correlationIds } from ':store/correlation-ids/store.js';
import { importKeyFromHexString } from ':util/cipher.js';
import { decryptPopup } from './decrypt.js';
import { postPopup } from './post.js';
import type { PopupWire } from './types.js';

/**
 * Open the popup, send a handshake, and store the wallet's public key so later `send` can encrypt.
 */
export async function handshake(wire: PopupWire, args: RequestArguments = { method: 'handshake' }) {
  await wire.communicator.waitForPopupLoaded?.();
  const response = await postPopup(
    wire,
    { handshake: { method: args.method, params: args.params ?? [] } },
    correlationIds.get(args)
  );
  if ('failure' in response.content) throw response.content.failure;
  await wire.keyManager.setPeerPublicKey(await importKeyFromHexString('public', response.sender));
  const decrypted = await decryptPopup(wire, response);
  if ('error' in decrypted.result) throw decrypted.result.error;
}
