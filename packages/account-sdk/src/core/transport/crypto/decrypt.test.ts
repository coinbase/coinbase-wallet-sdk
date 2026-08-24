import { createStoreInstance } from ':store/store.js';
import { generateKeyPair } from ':util/cipher.js';
import { KeyManager } from './KeyManager.js';
import { decrypt } from './decrypt.js';
import { encrypt } from './encrypt.js';

describe('decrypt', () => {
  it('throws when there is no shared secret', async () => {
    const keys = new KeyManager(createStoreInstance({ persist: false }));
    await expect(
      decrypt(keys, { iv: new Uint8Array(), cipherText: new ArrayBuffer(0) })
    ).rejects.toThrow('No shared secret when decrypting');
  });

  it('opens ciphertext produced by encrypt', async () => {
    const keys = new KeyManager(createStoreInstance({ persist: false }));
    const peer = await generateKeyPair();
    await keys.setPeerPublicKey(peer.publicKey);
    const request = { action: { method: 'eth_accounts', params: [] }, chainId: 1 };
    const encrypted = await encrypt(keys, request);
    await expect(decrypt(keys, encrypted)).resolves.toEqual(request);
  });
});
