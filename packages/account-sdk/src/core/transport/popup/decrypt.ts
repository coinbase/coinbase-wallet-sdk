import { RPCResponseMessage } from ':core/message/RPCMessage.js';
import { RPCResponse } from ':core/message/RPCResponse.js';
import { decrypt } from ':core/transport/crypto/index.js';
import { ingestPopupData } from './ingest.js';
import type { PopupWire } from './types.js';

/**
 * Decrypt a popup response, then ingest chains/capabilities.
 * `decrypt` is shared with WalletLink 2.0; ingest writes the SDK store.
 */
export async function decryptPopup(
  wire: PopupWire,
  message: RPCResponseMessage
): Promise<RPCResponse> {
  if ('failure' in message.content) throw message.content.failure;

  const response = await decrypt<RPCResponse>(wire.keys, message.content.encrypted);
  ingestPopupData(wire, response);
  return response;
}
