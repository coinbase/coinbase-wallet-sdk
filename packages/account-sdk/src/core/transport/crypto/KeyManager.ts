import { type Store, type StoreInstance, bindStore } from ':store/store.js';
import {
  deriveSharedSecret,
  exportKeyToHexString,
  generateKeyPair,
  importKeyFromHexString,
} from ':util/cipher.js';

interface StorageItem {
  storageKey: string;
  keyType: 'public' | 'private';
}
const OWN_PRIVATE_KEY = {
  storageKey: 'ownPrivateKey',
  keyType: 'private',
} as const;
const OWN_PUBLIC_KEY = {
  storageKey: 'ownPublicKey',
  keyType: 'public',
} as const;
const PEER_PUBLIC_KEY = {
  storageKey: 'peerPublicKey',
  keyType: 'public',
} as const;

/**
 * ECDH P-256 session keys used to encrypt RPC between this SDK and a wallet.
 *
 * Popup and WalletLink 2.0 share this manager. The delivery path (postMessage vs
 * relay) lives on the transport; encrypt/decrypt live as functions next to this
 * class. This manager only owns the keypair and shared secret.
 *
 * Distinct from `:owner-key`, which holds WebCrypto owner keys for sub-account
 * UserOperations.
 */
export class KeyManager {
  private ownPrivateKey: CryptoKey | null = null;
  private ownPublicKey: CryptoKey | null = null;
  private peerPublicKey: CryptoKey | null = null;
  private sharedSecret: CryptoKey | null = null;
  private readonly store: Store;

  constructor(storeInstance: StoreInstance) {
    this.store = bindStore(storeInstance);
  }

  async getOwnPublicKey(): Promise<CryptoKey> {
    await this.loadKeysIfNeeded();
    return this.ownPublicKey!;
  }

  async exportOwnPublicKeyHex(): Promise<string> {
    return exportKeyToHexString('public', await this.getOwnPublicKey());
  }

  /**
   * Shared AES-GCM key from ECDH(own private, peer public).
   * `null` until `setPeerPublicKey` — encrypt/decrypt throw unauthorized then.
   */
  async getSharedSecret(): Promise<CryptoKey | null> {
    await this.loadKeysIfNeeded();
    return this.sharedSecret;
  }

  /** Store the wallet's public key and derive the shared secret (invalidates the old one). */
  async setPeerPublicKey(key: CryptoKey) {
    this.sharedSecret = null;
    this.peerPublicKey = key;
    await this.storeKey(PEER_PUBLIC_KEY, key);
    await this.loadKeysIfNeeded();
  }

  async setPeerPublicKeyFromHex(hex: string) {
    await this.setPeerPublicKey(await importKeyFromHexString('public', hex));
  }

  async clear() {
    this.ownPrivateKey = null;
    this.ownPublicKey = null;
    this.peerPublicKey = null;
    this.sharedSecret = null;

    this.store.keys.clear();
  }

  private async generateOwnKeyPair() {
    const newKeyPair = await generateKeyPair();
    this.ownPrivateKey = newKeyPair.privateKey;
    this.ownPublicKey = newKeyPair.publicKey;
    await this.storeKey(OWN_PRIVATE_KEY, newKeyPair.privateKey);
    await this.storeKey(OWN_PUBLIC_KEY, newKeyPair.publicKey);
  }

  private async loadKeysIfNeeded() {
    // Own keypair: restore from the keys slice, or generate once and persist.
    if (this.ownPrivateKey === null) {
      this.ownPrivateKey = await this.loadKey(OWN_PRIVATE_KEY);
    }

    if (this.ownPublicKey === null) {
      this.ownPublicKey = await this.loadKey(OWN_PUBLIC_KEY);
    }

    if (this.ownPrivateKey === null || this.ownPublicKey === null) {
      await this.generateOwnKeyPair();
    }

    // Peer key + secret: only after handshake has stored the wallet public key.
    if (this.peerPublicKey === null) {
      this.peerPublicKey = await this.loadKey(PEER_PUBLIC_KEY);
    }

    if (this.sharedSecret === null) {
      if (this.ownPrivateKey === null || this.peerPublicKey === null) return;
      this.sharedSecret = await deriveSharedSecret(this.ownPrivateKey, this.peerPublicKey);
    }
  }

  private async loadKey(item: StorageItem): Promise<CryptoKey | null> {
    const key = this.store.keys.get(item.storageKey);
    if (!key) return null;

    return importKeyFromHexString(item.keyType, key);
  }

  private async storeKey(item: StorageItem, key: CryptoKey) {
    const hexString = await exportKeyToHexString(item.keyType, key);
    this.store.keys.set(item.storageKey, hexString);
  }
}
