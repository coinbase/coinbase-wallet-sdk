import { RPCRequest } from ':core/message/RPCRequest.js';
import { createStoreInstance } from ':store/store.js';
import { decryptContent, deriveSharedSecret, generateKeyPair } from ':util/cipher.js';
import { KeyManager } from './KeyManager.js';
import { decrypt } from './decrypt.js';
import { encrypt } from './encrypt.js';

describe('encrypt and decrypt', () => {
  const request: RPCRequest = {
    action: { method: 'eth_accounts', params: [] },
    chainId: 8453,
  };

  let keys: KeyManager;

  beforeEach(() => {
    keys = new KeyManager(createStoreInstance({ persist: false }));
  });

  it('should throw when encrypting before a peer public key is set', async () => {
    await expect(encrypt(keys, request)).rejects.toThrow('No shared secret when encrypting');
  });

  it('should throw when decrypting before a peer public key is set', async () => {
    const peer = await generateKeyPair();
    await keys.setPeerPublicKey(peer.publicKey);
    const encrypted = await encrypt(keys, request);
    await keys.clear();

    await expect(decrypt(keys, encrypted)).rejects.toThrow('No shared secret when decrypting');
  });

  it('should round-trip a request with the same keys', async () => {
    const peer = await generateKeyPair();
    await keys.setPeerPublicKey(peer.publicKey);

    const encrypted = await encrypt(keys, request);
    const decrypted = await decrypt<RPCRequest>(keys, encrypted);

    expect(decrypted).toEqual(request);
  });

  it('should produce ciphertext the peer can decrypt with the matching secret', async () => {
    const peer = await generateKeyPair();
    await keys.setPeerPublicKey(peer.publicKey);

    const encrypted = await encrypt(keys, request);
    const peerSecret = await deriveSharedSecret(peer.privateKey, await keys.getOwnPublicKey());
    const decrypted = await decryptContent<RPCRequest>(encrypted, peerSecret);

    expect(decrypted).toEqual(request);
  });
});
