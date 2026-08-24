import { standardErrors } from ':core/error/errors.js';
import { EncryptedData } from ':core/message/RPCMessage.js';
import { RPCRequest } from ':core/message/RPCRequest.js';
import { RPCResponse } from ':core/message/RPCResponse.js';
import { decryptContent } from ':util/cipher.js';
import type { KeyManager } from './KeyManager.js';

/**
 * Open ciphertext produced by `encrypt` (or the wallet) with the shared secret.
 *
 * Call after handshake. Popup `decryptPopup` wraps this and then ingests chains.
 */
export async function decrypt<R extends RPCRequest | RPCResponse>(
  keys: KeyManager,
  encrypted: EncryptedData
): Promise<R> {
  const sharedSecret = await keys.getSharedSecret();
  if (!sharedSecret) {
    throw standardErrors.provider.unauthorized('No shared secret when decrypting');
  }
  return decryptContent<R>(encrypted, sharedSecret);
}
