import { RequestArguments } from ':core/message/RequestArguments.js';
import { encrypt } from ':core/transport/crypto/index.js';
import { decryptPopup } from './decrypt.js';
import { postPopup } from './post.js';
import type { PopupWire } from './types.js';

/**
 * Encrypted CAIP JSON-RPC to the popup (protocol v2).
 *
 * Seals `{ action: request }`, posts ciphertext, and decrypts the reply.
 * Chain targeting lives solely in the CAIP-25/27 action.
 */
export async function send(wire: PopupWire, request: RequestArguments, correlationId?: string) {
  await wire.communicator.waitForPopupLoaded?.();
  const encrypted = await encrypt(wire.keys, { action: request });
  const response = await postPopup(wire, { encrypted }, correlationId);
  return decryptPopup(wire, response);
}
