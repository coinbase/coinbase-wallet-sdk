import { RPCRequestMessage, RPCResponseMessage } from ':core/message/RPCMessage.js';
import { exportKeyToHexString } from ':util/cipher.js';
import type { PopupIO } from './types.js';

/**
 * Post one RPC message to the keys popup and wait for the matching response.
 * Used by both handshake (plaintext key exchange) and encrypted `send`.
 */
export async function postPopup(
  wire: PopupIO,
  content: RPCRequestMessage['content'],
  correlationId?: string
): Promise<RPCResponseMessage> {
  const publicKey = await exportKeyToHexString('public', await wire.keys.getOwnPublicKey());
  const message: RPCRequestMessage = {
    id: crypto.randomUUID(),
    correlationId,
    sender: publicKey,
    content,
    timestamp: new Date(),
  };
  return wire.communicator.postRequestAndWaitForResponse(message);
}
