// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { Observable } from 'rxjs';
import { hexStringToUint8Array, uint8ArrayToHex } from '../util';

/**
 *
 * @param plainText string to be encrypted
 * @param secret hex representation of 32-byte secret
 * returns hex string representation of bytes in the order: initialization vector (iv),
 * auth tag, encrypted plaintext. IV is 12 bytes. Auth tag is 16 bytes. Remaining bytes are the
 * encrypted plainText.
 */
export async function encrypt(plainText: string, secret: string): Promise<string> {
  if (secret.length != 64) throw Error(`secret must be 256 bits`)
  const ivBytes = crypto.getRandomValues(new Uint8Array(12))
  const secretKey: CryptoKey = await crypto.subtle.importKey(
    "raw",
    hexStringToUint8Array(secret),
    { "name": "aes-gcm" },
    false,
    ["encrypt", "decrypt"]
  )

  let enc = new TextEncoder()

  // Will return encrypted plainText with auth tag (ie MAC or checksum) appended at the end
  const encryptedResult: ArrayBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ivBytes
    },
    secretKey,
    enc.encode(plainText)
  );

  let tagLength = 16
  let authTag: ArrayBuffer = encryptedResult.slice(encryptedResult.byteLength - tagLength)
  let encryptedPlaintext = encryptedResult.slice(0, encryptedResult.byteLength - tagLength)

  let authTagBytes = new Uint8Array(authTag)
  let encryptedPlaintextBytes = new Uint8Array(encryptedPlaintext)
  let concatted = new Uint8Array([...ivBytes, ...authTagBytes, ...encryptedPlaintextBytes])
  return uint8ArrayToHex(concatted)
}

/**
 *
 * @param cipherText hex string representation of bytes in the order: initialization vector (iv),
 * auth tag, encrypted plaintext. IV is 12 bytes. Auth tag is 16 bytes.
 * @param secret hex string representation of 32-byte secret
 */
export function decrypt(cipherText: string, secret: string): Observable<string> {
  if (secret.length != 64) throw Error(`secret must be 256 bits`)
  return new Observable<string>(function (subscriber) {
    (async function() {
      const secretKey: CryptoKey = await crypto.subtle.importKey(
        "raw",
        hexStringToUint8Array(secret),
        { "name": "aes-gcm" },
        false,
        ["encrypt", "decrypt"]
      )

      const encrypted: Uint8Array = hexStringToUint8Array(cipherText)

      const ivBytes = encrypted.slice(0, 12)
      const authTagBytes = encrypted.slice(12, 28)
      const encryptedPlaintextBytes = encrypted.slice(28)
      const concattedBytes = new Uint8Array([...encryptedPlaintextBytes, ...authTagBytes])
      const algo = {
        name: "AES-GCM",
        iv: new Uint8Array(ivBytes)
      }
      try {
        const decrypted = await window.crypto.subtle.decrypt(
          algo,
          secretKey,
          concattedBytes
        )
        let decoder = new TextDecoder()
        subscriber.next(decoder.decode(decrypted))
        subscriber.complete()
      } catch (err) {
        subscriber.error(err)
      }
    })()
  })
}