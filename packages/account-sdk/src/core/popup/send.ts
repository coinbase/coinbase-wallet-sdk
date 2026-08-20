import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { correlationIds } from ':store/correlation-ids/store.js';
import { encryptContent } from ':util/cipher.js';
import { decryptPopup } from './decrypt.js';
import { postPopup } from './post.js';
import type { PopupIO } from './types.js';

/**
 * Encrypt `{ action, chainId }` with the handshake secret and post it to the popup.
 */
export async function send(wire: PopupIO, request: RequestArguments): Promise<unknown> {
  await wire.communicator.waitForPopupLoaded?.();
  const sharedSecret = await wire.keys.getSharedSecret();
  if (!sharedSecret) {
    throw standardErrors.provider.unauthorized('No shared secret when encrypting request');
  }

  const encrypted = await encryptContent(
    { action: request, chainId: wire.chainId() },
    sharedSecret
  );
  const response = await postPopup(wire, { encrypted }, correlationIds.get(request));
  const decrypted = await decryptPopup(wire, response);
  if ('error' in decrypted.result) throw decrypted.result.error;
  return decrypted.result.value;
}
