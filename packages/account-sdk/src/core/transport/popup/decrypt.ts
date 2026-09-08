import { RPCResponseMessage } from ':core/message/RPCMessage.js';
import { RPCResponse } from ':core/message/RPCResponse.js';
import { decrypt } from ':core/transport/crypto/index.js';
import type { PopupWire } from './types.js';

/** Decrypt one popup response without projecting namespace-specific state. */
export async function decryptPopup(
  wire: PopupWire,
  message: RPCResponseMessage
): Promise<RPCResponse> {
  if ('failure' in message.content) throw message.content.failure;

  return decrypt<RPCResponse>(wire.keys, message.content.encrypted);
}
