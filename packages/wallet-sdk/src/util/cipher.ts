import { EncryptedData } from ':core/message/RPCMessage.js';
import { RPCRequest } from ':core/message/RPCRequest.js';
import { RPCResponse } from ':core/message/RPCResponse.js';
import { hexStringToUint8Array, uint8ArrayToHex } from ':core/type/util.js';

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey']
  );
}

export async function deriveSharedSecret(
  ownPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: peerPublicKey,
    },
    ownPrivateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(sharedSecret: CryptoKey, plainText: string): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherText = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    sharedSecret,
    new TextEncoder().encode(plainText)
  );

  return { iv, cipherText };
}

export async function decrypt(
  sharedSecret: CryptoKey,
  { iv, cipherText }: EncryptedData
): Promise<string> {
  const plainText = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    sharedSecret,
    cipherText
  );

  return new TextDecoder().decode(plainText);
}

function getFormat(keyType: 'public' | 'private') {
  switch (keyType) {
    case 'public':
      return 'spki';
    case 'private':
      return 'pkcs8';
  }
}

export async function exportKeyToHexString(
  type: 'public' | 'private',
  key: CryptoKey
): Promise<string> {
  const format = getFormat(type);
  const exported = await crypto.subtle.exportKey(format, key);
  return uint8ArrayToHex(new Uint8Array(exported));
}

export async function importKeyFromHexString(
  type: 'public' | 'private',
  hexString: string
): Promise<CryptoKey> {
  const format = getFormat(type);
  const arrayBuffer = hexStringToUint8Array(hexString).buffer;
  return await crypto.subtle.importKey(
    format,
    new Uint8Array(arrayBuffer),
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    type === 'private' ? ['deriveKey'] : []
  );
}

export async function encryptContent(
  content: RPCRequest | RPCResponse,
  sharedSecret: CryptoKey
): Promise<EncryptedData> {
  const serialized = JSON.stringify(content, (_, value) => {
    if (!(value instanceof Error)) return value;

    const error = value as Error & { code?: unknown };
    return {
      ...(error.code ? { code: error.code } : {}),
      message: error.message,
    };
  });
  return encrypt(sharedSecret, serialized);
}

export async function decryptContent<R extends RPCRequest | RPCResponse>(
  encryptedData: EncryptedData,
  sharedSecret: CryptoKey
): Promise<R> {
  return JSON.parse(await decrypt(sharedSecret, encryptedData));
}
