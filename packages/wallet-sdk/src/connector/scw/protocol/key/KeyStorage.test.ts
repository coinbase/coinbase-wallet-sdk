import { ScopedLocalStorage } from '../../../../lib/ScopedLocalStorage';
import { generateKeyPair } from '../KeyManager';
import { KeyStorage } from './KeyStorage';

describe('KeyStorage', () => {
  let storage: ScopedLocalStorage;
  let keyStorage: KeyStorage;

  beforeEach(() => {
    storage = new ScopedLocalStorage('test');
    keyStorage = new KeyStorage(storage);
  });

  describe('getOwnPublicKey', () => {
    it('should return the own public key', async () => {
      const publicKey = await keyStorage.getOwnPublicKey();
      expect(publicKey).toBeDefined();
    });

    it('should return the same public key on subsequent calls', async () => {
      const firstPublicKey = await keyStorage.getOwnPublicKey();
      const secondPublicKey = await keyStorage.getOwnPublicKey();

      expect(firstPublicKey).toBe(secondPublicKey);
    });

    it('should not return the same public key after resetting the own key pair', async () => {
      const firstPublicKey = await keyStorage.getOwnPublicKey();
      await keyStorage.resetKeys();
      const secondPublicKey = await keyStorage.getOwnPublicKey();

      expect(firstPublicKey).not.toBe(secondPublicKey);
    });

    it('should load the same public key from storage with new instance', async () => {
      const firstPublicKey = await keyStorage.getOwnPublicKey();

      const anotherKeyStorage = new KeyStorage(storage);
      const secondPublicKey = await anotherKeyStorage.getOwnPublicKey();

      expect(firstPublicKey).toStrictEqual(secondPublicKey);
    });
  });

  describe('getSharedSecret', () => {
    it('should return null if the shared secret is not yet derived', async () => {
      const sharedSecret = await keyStorage.getSharedSecret();
      expect(sharedSecret).toBeNull();
    });

    it('should return the shared secret after setting the peer public key', async () => {
      const peerKeyPair = await generateKeyPair();
      await keyStorage.setPeerPublicKey(peerKeyPair.publicKey);

      const sharedSecret = await keyStorage.getSharedSecret();

      expect(sharedSecret).toBeDefined();
    });

    it('should load the same keys from storage', async () => {
      const peerKeyPair = await generateKeyPair();
      await keyStorage.setPeerPublicKey(peerKeyPair.publicKey);

      const sharedSecret = await keyStorage.getSharedSecret();

      const anotherKeyStorage = new KeyStorage(storage);
      const sharedSecretFromAnotherStorage = await anotherKeyStorage.getSharedSecret();

      expect(sharedSecret).toStrictEqual(sharedSecretFromAnotherStorage);
    });
  });

  describe('setPeerPublicKey', () => {
    it('should derive different shared secret after resetting the peer public key', async () => {
      const peerKeyPair = await generateKeyPair();
      await keyStorage.setPeerPublicKey(peerKeyPair.publicKey);
      const sharedSecret = await keyStorage.getSharedSecret();

      const newPeerKeyPair = await generateKeyPair();
      await keyStorage.setPeerPublicKey(newPeerKeyPair.publicKey);
      const newSharedSecret = await keyStorage.getSharedSecret();

      expect(sharedSecret).not.toBe(newSharedSecret);
    });
  });

  describe('resetKeys', () => {
    it('should reset the keys', async () => {
      const ownPublicKey = await keyStorage.getOwnPublicKey();

      await keyStorage.resetKeys();

      const newOwnPublicKey = await keyStorage.getOwnPublicKey();
      const sharedSecret = await keyStorage.getSharedSecret();

      expect(ownPublicKey).not.toBe(newOwnPublicKey);
      expect(sharedSecret).toBeNull();
    });
  });
});
