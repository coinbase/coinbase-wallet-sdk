import { bindStore, createStoreInstance } from ':store/store.js';
import { generateKeyPair } from ':util/cipher.js';
import { KeyManager } from './KeyManager.js';

describe('KeyManager', () => {
  let keys: KeyManager;
  let storeInstance: ReturnType<typeof createStoreInstance>;

  beforeEach(() => {
    storeInstance = createStoreInstance({ persist: false });
    keys = new KeyManager(bindStore(storeInstance).keys);
  });

  describe('getOwnPublicKey', () => {
    it('should return the own public key', async () => {
      const publicKey = await keys.getOwnPublicKey();
      expect(publicKey).toBeDefined();
    });

    it('should return the same public key on subsequent calls', async () => {
      const firstPublicKey = await keys.getOwnPublicKey();
      const secondPublicKey = await keys.getOwnPublicKey();

      expect(firstPublicKey).toBe(secondPublicKey);
    });

    it('should not return the same public key after resetting the own key pair', async () => {
      const firstPublicKey = await keys.getOwnPublicKey();
      await keys.clear();
      const secondPublicKey = await keys.getOwnPublicKey();

      expect(firstPublicKey).not.toBe(secondPublicKey);
    });

    it('should load the same public key from storage with new instance', async () => {
      const firstPublicKey = await keys.getOwnPublicKey();

      const another = new KeyManager(bindStore(storeInstance).keys);
      const secondPublicKey = await another.getOwnPublicKey();

      expect(firstPublicKey).toStrictEqual(secondPublicKey);
    });
  });

  describe('getSharedSecret', () => {
    it('should return null if the shared secret is not yet derived', async () => {
      const sharedSecret = await keys.getSharedSecret();
      expect(sharedSecret).toBeNull();
    });

    it('should return the shared secret after setting the peer public key', async () => {
      const peerKeyPair = await generateKeyPair();
      await keys.setPeerPublicKey(peerKeyPair.publicKey);

      const sharedSecret = await keys.getSharedSecret();

      expect(sharedSecret).toBeDefined();
    });

    it('should load the same keys from storage', async () => {
      const peerKeyPair = await generateKeyPair();
      await keys.setPeerPublicKey(peerKeyPair.publicKey);

      const sharedSecret = await keys.getSharedSecret();

      const another = new KeyManager(bindStore(storeInstance).keys);
      const sharedSecretFromAnother = await another.getSharedSecret();

      expect(sharedSecret).toStrictEqual(sharedSecretFromAnother);
    });
  });

  describe('setPeerPublicKey', () => {
    it('should derive different shared secret after resetting the peer public key', async () => {
      const peerKeyPair = await generateKeyPair();
      await keys.setPeerPublicKey(peerKeyPair.publicKey);
      const sharedSecret = await keys.getSharedSecret();

      const newPeerKeyPair = await generateKeyPair();
      await keys.setPeerPublicKey(newPeerKeyPair.publicKey);
      const newSharedSecret = await keys.getSharedSecret();

      expect(sharedSecret).not.toBe(newSharedSecret);
    });
  });

  describe('clear', () => {
    it('should reset the keys', async () => {
      const ownPublicKey = await keys.getOwnPublicKey();

      await keys.clear();

      const newOwnPublicKey = await keys.getOwnPublicKey();
      const sharedSecret = await keys.getSharedSecret();

      expect(ownPublicKey).not.toBe(newOwnPublicKey);
      expect(sharedSecret).toBeNull();
    });
  });
});
