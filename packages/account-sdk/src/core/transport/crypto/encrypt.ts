import { standardErrors } from ':core/error/errors.js';
import { EncryptedData } from ':core/message/RPCMessage.js';
import { RPCRequest } from ':core/message/RPCRequest.js';
import { RPCResponse } from ':core/message/RPCResponse.js';
import { encryptContent } from ':util/cipher.js';
import type { KeyManager } from './KeyManager.js';

/**
 * Seal `{ action, chainId }` (or a response) with the ECDH shared secret.
 *
 * Callers: popup `send` and future WalletLink 2.0. Requires a prior handshake
 * (`KeyManager.setPeerPublicKey`). Throws unauthorized if the secret is missing.
 */
export async function encrypt(
  keys: KeyManager,
  content: RPCRequest | RPCResponse
): Promise<EncryptedData> {
  const sharedSecret = await keys.getSharedSecret();
  if (!sharedSecret) {
    throw standardErrors.provider.unauthorized('No shared secret when encrypting');
  }
  return encryptContent(content, sharedSecret);
}
