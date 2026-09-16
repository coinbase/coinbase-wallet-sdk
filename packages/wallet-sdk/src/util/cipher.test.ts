import { decrypt, deriveSharedSecret, encrypt, generateKeyPair } from './cipher.js';

describe('Cipher', () => {
  describe('generateKeyPair', () => {
    it('should generate a unique key pair on each call', async () => {
      const firstPublicKey = (await generateKeyPair()).publicKey;
      const secondPublicKey = (await generateKeyPair()).publicKey;

      expect(firstPublicKey).not.toBe(secondPublicKey);
    });
  });

  describe('deriveSharedSecret', () => {
    it('should derive a shared secret successfully', async () => {
      const ownKeyPair = await generateKeyPair();
      const peerKeyPair = await generateKeyPair();

      const sharedSecret = await deriveSharedSecret(ownKeyPair.privateKey, peerKeyPair.publicKey);
      expect(sharedSecret).toBeDefined();
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a message successfully', async () => {
      const ownKeyPair = await generateKeyPair();
      const peerKeyPair = await generateKeyPair();

      const sharedSecret = await deriveSharedSecret(ownKeyPair.privateKey, peerKeyPair.publicKey);
      const sharedSecretDerivedByPeer = await deriveSharedSecret(
        peerKeyPair.privateKey,
        ownKeyPair.publicKey
      );

      const plaintext = 'This is a secret message';
      const encryptedMessage = await encrypt(sharedSecret, plaintext);
      const decryptedText = await decrypt(sharedSecretDerivedByPeer, encryptedMessage);

      expect(decryptedText).toBe(plaintext);
    });

    it('should throw an error when decrypting with a different shared secret', async () => {
      const ownKeyPair = await generateKeyPair();
      const peerKeyPair = await generateKeyPair();

      const sharedSecret = await deriveSharedSecret(ownKeyPair.privateKey, peerKeyPair.publicKey);

      const plaintext = 'This is a secret message';

      const encryptedMessage = await encrypt(sharedSecret, plaintext);

      // generate new keypair on otherKeyManager and use it to derive different shared secret
      const sharedSecretDerivedByPeer = await deriveSharedSecret(
        peerKeyPair.privateKey,
        peerKeyPair.publicKey
      );

      // Attempting to decrypt with a different shared secret
      await expect(decrypt(sharedSecretDerivedByPeer, encryptedMessage)).rejects.toThrow(
        'The operation failed for an operation-specific reason'
      );
    });
  });
});
