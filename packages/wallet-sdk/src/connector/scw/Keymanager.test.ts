import { KeyManager } from './KeyManager';

class TestKeyManager extends KeyManager {
  storeSessionData<T>(data: T): T {
    return data;
  }
}

describe('KeyManager', () => {
  let keyManager: KeyManager;

  beforeEach(() => {
    keyManager = new TestKeyManager();
  });

  describe('generateKeyPair', () => {
    it('should generate a unique key pair on each call', async () => {
      await keyManager.generateKeyPair();
      const firstPublicKey = keyManager.publicKey;

      await keyManager.generateKeyPair();
      const secondPublicKey = keyManager.publicKey;

      expect(firstPublicKey).not.toBe(secondPublicKey);
    });
  });

  describe('deriveSharedSecret', () => {
    it('should derive a shared secret successfully', async () => {
      await keyManager.generateKeyPair();

      const otherKeyManager = new TestKeyManager();
      await otherKeyManager.generateKeyPair();

      await keyManager.deriveSharedSecret(otherKeyManager.publicKey!);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore-next-line
      expect(keyManager.sharedSecret).toBeDefined();
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a message successfully', async () => {
      await keyManager.generateKeyPair();

      const otherKeyManager = new TestKeyManager();
      await otherKeyManager.generateKeyPair();

      await keyManager.deriveSharedSecret(otherKeyManager.publicKey!);
      await otherKeyManager.deriveSharedSecret(keyManager.publicKey!);

      const plaintext = 'This is a secret message';
      const encryptedMessage = await keyManager.encrypt(plaintext);
      const decryptedMessage = await otherKeyManager.decrypt(encryptedMessage);

      expect(decryptedMessage).toBe(plaintext);
    });

    it('should throw an error when decrypting with a different shared secret', async () => {
      await keyManager.generateKeyPair();

      const otherKeyManager = new TestKeyManager();
      await otherKeyManager.generateKeyPair();

      await keyManager.deriveSharedSecret(otherKeyManager.publicKey!);

      const plaintext = 'This is a secret message';

      const encryptedMessage = await keyManager.encrypt(plaintext);

      // generate new keypair on otherKeyManager and use it to derive different shared secret
      await otherKeyManager.generateKeyPair();
      await keyManager.deriveSharedSecret(otherKeyManager.publicKey!);

      // Attempting to decrypt with a different shared secret
      await expect(keyManager.decrypt(encryptedMessage)).rejects.toThrow(
        'Unsupported state or unable to authenticate data'
      );
    });
  });

  describe('reset', () => {
    it('should reset keyManager state completely', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore-next-line
      keyManager.privateKey = {} as CryptoKey;
      keyManager.publicKey = {} as CryptoKey;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore-next-line
      keyManager.sharedSecret = {} as CryptoKey;
      keyManager.reset();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore-next-line
      expect(keyManager.privateKey).toBeNull();
      expect(keyManager.publicKey).toBeNull();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore-next-line
      expect(keyManager.sharedSecret).toBeNull();
    });
  });
});
