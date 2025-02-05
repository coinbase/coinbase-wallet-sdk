// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { hexStringToUint8Array, uint8ArrayToHex } from ':core/type/util.js';

export class WalletLinkCipher {
  // @param secret hex representation of 32-byte secret
  constructor(private readonly secret: string) {}

  /**
   *
   * @param plainText string to be encrypted
   * returns hex string representation of bytes in the order: initialization vector (iv),
   * auth tag, encrypted plaintext. IV is 12 bytes. Auth tag is 16 bytes. Remaining bytes are the
   * encrypted plainText.
   */
  async encrypt(plainText: string): Promise<string> {
    const secret = this.secret;
    if (secret.length !== 64) throw Error(`secret must be 256 bits`);
    const ivBytes = crypto.getRandomValues(new Uint8Array(12));
    const secretKey: CryptoKey = await crypto.subtle.importKey(
      'raw',
      hexStringToUint8Array(secret),
      { name: 'aes-gcm' },
      false,
      ['encrypt', 'decrypt']
    );

    const enc = new TextEncoder();

    // Will return encrypted plainText with auth tag (ie MAC or checksum) appended at the end
    const encryptedResult: ArrayBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes,
      },
      secretKey,
      enc.encode(plainText)
    );

    const tagLength = 16;
    const authTag: ArrayBuffer = encryptedResult.slice(encryptedResult.byteLength - tagLength);
    const encryptedPlaintext = encryptedResult.slice(0, encryptedResult.byteLength - tagLength);

    const authTagBytes = new Uint8Array(authTag);
    const encryptedPlaintextBytes = new Uint8Array(encryptedPlaintext);
    const concatenated = new Uint8Array([...ivBytes, ...authTagBytes, ...encryptedPlaintextBytes]);
    return uint8ArrayToHex(concatenated);
  }

  /**
   *
   * @param cipherText hex string representation of bytes in the order: initialization vector (iv),
   * auth tag, encrypted plaintext. IV is 12 bytes. Auth tag is 16 bytes.
   */
  async decrypt(cipherText: string): Promise<string> {
    const secret = this.secret;
    if (secret.length !== 64) throw Error(`secret must be 256 bits`);
    return new Promise<string>((resolve, reject) => {
      void (async function () {
        const secretKey: CryptoKey = await crypto.subtle.importKey(
          'raw',
          hexStringToUint8Array(secret),
          { name: 'aes-gcm' },
          false,
          ['encrypt', 'decrypt']
        );

        const encrypted: Uint8Array = hexStringToUint8Array(cipherText);

        const ivBytes = encrypted.slice(0, 12);
        const authTagBytes = encrypted.slice(12, 28);
        const encryptedPlaintextBytes = encrypted.slice(28);
        const concatenatedBytes = new Uint8Array([...encryptedPlaintextBytes, ...authTagBytes]);
        const algo = {
          name: 'AES-GCM',
          iv: new Uint8Array(ivBytes),
        };
        try {
          const decrypted = await window.crypto.subtle.decrypt(algo, secretKey, concatenatedBytes);
          const decoder = new TextDecoder();
          resolve(decoder.decode(decrypted));
        } catch (err) {
          reject(err);
        }
      })();
    });
  }
}
