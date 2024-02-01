import { ScopedLocalStorage } from '../../../../lib/ScopedLocalStorage';
import {
  deriveSharedSecret,
  exportKeyToHexString,
  generateKeyPair,
  importKeyFromHexString,
} from '../KeyManager';

interface StorageItem {
  storageKey: string;
  keyType: 'public' | 'private';
}
const OWN_PRIVATE_KEY = {
  storageKey: 'SCW:ownPrivateKey',
  keyType: 'private',
} as const;
const OWN_PUBLIC_KEY = {
  storageKey: 'SCW:ownPublicKey',
  keyType: 'public',
} as const;
const PEER_PUBLIC_KEY = {
  storageKey: 'SCW:peerPublicKey',
  keyType: 'public',
} as const;

export class KeyStorage {
  private ownPrivateKey: CryptoKey | null = null;
  private ownPublicKey: CryptoKey | null = null;
  private peerPublicKey: CryptoKey | null = null;
  private sharedSecret: CryptoKey | null = null;

  constructor(private storage: ScopedLocalStorage) {}

  async getOwnPublicKey(): Promise<CryptoKey> {
    await this.loadKeysIfNeeded();
    return this.ownPublicKey!;
  }

  // returns null if the shared secret is not yet derived
  async getSharedSecret(): Promise<CryptoKey | null> {
    await this.loadKeysIfNeeded();
    return this.sharedSecret;
  }

  async setPeerPublicKey(key: CryptoKey) {
    this.sharedSecret = null;
    this.peerPublicKey = key;
    await this.storeKey(PEER_PUBLIC_KEY, key);
    await this.loadKeysIfNeeded();
  }

  async resetKeys() {
    this.ownPrivateKey = null;
    this.ownPublicKey = null;
    this.peerPublicKey = null;
    this.sharedSecret = null;

    await this.storage.removeItem(OWN_PUBLIC_KEY.storageKey);
    await this.storage.removeItem(OWN_PRIVATE_KEY.storageKey);
    await this.storage.removeItem(PEER_PUBLIC_KEY.storageKey);

    await this.generateKeyPair();
  }

  private async generateKeyPair() {
    const newKeyPair = await generateKeyPair();
    this.ownPrivateKey = newKeyPair.privateKey;
    this.ownPublicKey = newKeyPair.publicKey;
    await this.storeKey(OWN_PRIVATE_KEY, newKeyPair.privateKey);
    await this.storeKey(OWN_PUBLIC_KEY, newKeyPair.publicKey);
  }

  private async loadKeysIfNeeded() {
    if (this.ownPrivateKey === null) {
      this.ownPrivateKey = await this.loadKey(OWN_PRIVATE_KEY);
    }

    if (this.ownPublicKey === null) {
      this.ownPublicKey = await this.loadKey(OWN_PUBLIC_KEY);
    }

    if (this.ownPrivateKey === null || this.ownPublicKey === null) {
      await this.generateKeyPair();
    }

    if (this.peerPublicKey === null) {
      this.peerPublicKey = await this.loadKey(PEER_PUBLIC_KEY);
    }

    if (this.sharedSecret === null) {
      if (this.ownPrivateKey === null || this.peerPublicKey === null) return;
      this.sharedSecret = await deriveSharedSecret(this.ownPrivateKey, this.peerPublicKey);
    }
  }

  // storage methods

  private async loadKey(item: StorageItem): Promise<CryptoKey | null> {
    const key = await this.storage.getItem(item.storageKey);
    if (!key) return null;

    return importKeyFromHexString(item.keyType, key);
  }

  private async storeKey(item: StorageItem, key: CryptoKey) {
    const hexString = await exportKeyToHexString(item.keyType, key);
    await this.storage.setItem(item.storageKey, hexString);
  }
}
