import { standardErrors } from ':core/error/errors.js';
import { RPCResponseMessage } from ':core/message/RPCMessage.js';
import { RPCResponse } from ':core/message/RPCResponse.js';
import { decryptContent } from ':util/cipher.js';
import { ingestPopupData } from './ingest.js';
import type { PopupIO } from './types.js';

/**
 * Decrypt a popup response with the shared secret, then ingest chains/capabilities into the store.
 */
export async function decryptPopup(
  wire: PopupIO,
  message: RPCResponseMessage
): Promise<RPCResponse> {
  if ('failure' in message.content) throw message.content.failure;

  const sharedSecret = await wire.keys.getSharedSecret();
  if (!sharedSecret) {
    throw standardErrors.provider.unauthorized('No shared secret when decrypting response');
  }

  const response: RPCResponse = await decryptContent(message.content.encrypted, sharedSecret);
  ingestPopupData(wire, response);
  return response;
}
