export abstract class KeyManager {
  private privateKey: CryptoKey | null;
  publicKey: CryptoKey | null;
  private sharedSecret: CryptoKey | null;

  constructor() {
    this.privateKey = null;
    this.publicKey = null;
    this.sharedSecret = null;
  }

  async generateKeyPair() {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false,
      ['deriveKey']
    );

    this.privateKey = keyPair.privateKey;
    this.publicKey = keyPair.publicKey;
  }

  async deriveSharedSecret(otherPublicKey: CryptoKey) {
    if (!this.privateKey) {
      throw new Error('Private key not set, call generateKeyPair() first');
    }
    const sharedSecret = await crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: otherPublicKey,
      },
      this.privateKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    );

    this.sharedSecret = sharedSecret;
  }

  async encrypt(plainText: string | undefined) {
    if (!this.sharedSecret) {
      throw new Error('Shared secret not set, call deriveSharedSecret() first');
    }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipherText = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      this.sharedSecret,
      new TextEncoder().encode(plainText)
    );

    return { iv, cipherText };
  }

  async decrypt({ iv, cipherText }: { iv: Uint8Array; cipherText: ArrayBuffer }) {
    if (!this.sharedSecret) {
      throw new Error('Shared secret not set, call deriveSharedSecret() first');
    }
    const plainText = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      this.sharedSecret,
      cipherText
    );

    return new TextDecoder().decode(plainText);
  }

  reset() {
    this.privateKey = null;
    this.publicKey = null;
    this.sharedSecret = null;
  }

  public abstract storeSessionData(data: unknown): void;
}
