import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/ciphers/webcrypto';
import { secp256r1 } from '@noble/curves/p256';
import { Buffer } from 'buffer';

import { MobileEncryptedData, RPCRequest, RPCResponse } from ':core/message';
import { hexStringToUint8Array, uint8ArrayToHex } from ':core/type/util';

type CryptoKeyPair = {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
};

type CryptoKey = {
  type: 'private' | 'public' | 'secret';
  algorithm: {
    name: string;
    namedCurve?: string;
    length?: number;
  };
  extractable: boolean;
  usages: string[];
  _key: Uint8Array;
};

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  const privateKey = secp256r1.utils.randomPrivateKey();
  const publicKey = secp256r1.getPublicKey(privateKey, false);

  return {
    privateKey: {
      type: 'private',
      algorithm: {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      extractable: true,
      usages: ['deriveKey'],
      _key: privateKey,
    },
    publicKey: {
      type: 'public',
      algorithm: {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      extractable: true,
      usages: [],
      _key: publicKey,
    },
  } as CryptoKeyPair;
}

export async function deriveSharedSecret(
  ownPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promise<CryptoKey> {
  const privateKeyRaw = ownPrivateKey._key;
  const publicKeyRaw = peerPublicKey._key;

  const sharedSecret = secp256r1.getSharedSecret(privateKeyRaw, publicKeyRaw);
  const aesKey = sharedSecret.slice(1, 33);

  return {
    type: 'secret',
    algorithm: {
      name: 'AES-GCM',
      length: 256,
    },
    extractable: false,
    usages: ['encrypt', 'decrypt'],
    _key: aesKey,
  };
}

export async function encrypt(
  sharedSecret: CryptoKey,
  plainText: string
): Promise<MobileEncryptedData> {
  const iv = randomBytes(12);
  const stream = gcm(sharedSecret._key, iv);
  const plainTextBytes = new Uint8Array(Buffer.from(plainText, 'utf8'));
  const cipherText = stream.encrypt(plainTextBytes);

  return {
    iv,
    cipherText,
  };
}

export async function decrypt(
  sharedSecret: CryptoKey,
  { iv, cipherText }: MobileEncryptedData
): Promise<string> {
  const stream = gcm(new Uint8Array(sharedSecret._key), new Uint8Array(iv));
  const plainTextBytes = stream.decrypt(new Uint8Array(cipherText));

  return Buffer.from(plainTextBytes).toString('utf8');
}

export async function exportKeyToHexString(
  type: 'public' | 'private',
  key: CryptoKey
): Promise<string> {
  let exported: Uint8Array;

  if (type === 'public') {
    exported = encodeECPublicKey(key._key);
  } else {
    exported = key._key;
  }

  return uint8ArrayToHex(exported);
}

export async function importKeyFromHexString(
  type: 'public' | 'private',
  hexString: string
): Promise<CryptoKey> {
  const data = hexStringToUint8Array(hexString);
  const [, sequenceContent] = decodeDER(data, 0);

  let importedKey: Uint8Array;

  if (type === 'public') {
    // The public key is the last 65 bytes of the sequence
    importedKey = sequenceContent.slice(-65);
  } else {
    if (!secp256r1.utils.isValidPrivateKey(data)) {
      throw new Error('Invalid private key');
    }
    importedKey = data;
  }

  return {
    type,
    algorithm: {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    extractable: true,
    usages: type === 'private' ? ['deriveKey'] : [],
    _key: importedKey,
  };
}

export async function encryptContent(
  content: RPCRequest | RPCResponse,
  sharedSecret: CryptoKey
): Promise<MobileEncryptedData> {
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
  encryptedData: {
    iv: Record<string, number>;
    cipherText: Record<string, number>;
  },
  sharedSecret: CryptoKey
): Promise<R> {
  function convertObjectToUint8Array(obj: Record<string, number>): Uint8Array {
    const sortedValues = Object.entries(obj)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([_, value]) => value);
    return new Uint8Array(sortedValues);
  }

  return JSON.parse(
    await decrypt(sharedSecret, {
      iv: convertObjectToUint8Array(encryptedData.iv),
      cipherText: convertObjectToUint8Array(encryptedData.cipherText),
    })
  );
}

function encodeLength(length: number): Uint8Array {
  if (length < 128) {
    return new Uint8Array([length]);
  }
  const lengthBytes = [];
  while (length > 0) {
    lengthBytes.unshift(length & 0xff);
    length >>= 8;
  }
  return new Uint8Array([0x80 | lengthBytes.length, ...lengthBytes]);
}

function encodeDER(tag: number, value: Uint8Array): Uint8Array {
  const length = encodeLength(value.length);
  return new Uint8Array([tag, ...length, ...value]);
}

function encodeSEQUENCE(...children: Uint8Array[]): Uint8Array {
  const totalLength = children.reduce((sum, child) => sum + child.length, 0);
  const length = encodeLength(totalLength);
  return new Uint8Array([0x30, ...length, ...children.flatMap((child) => Array.from(child))]);
}

function encodeOID(oid: string): Uint8Array {
  const parts = oid.split('.').map(Number);
  const firstByte = 40 * parts[0] + parts[1];
  const restBytes = parts.slice(2).flatMap((part) => {
    const bytes = [];
    do {
      bytes.unshift(part & 0x7f);
      part >>= 7;
    } while (part > 0);
    bytes[0] |= 0x80;
    bytes[bytes.length - 1] &= 0x7f;
    return bytes;
  });
  return encodeDER(0x06, new Uint8Array([firstByte, ...restBytes]));
}

function encodeBITSTRING(data: Uint8Array): Uint8Array {
  return encodeDER(0x03, new Uint8Array([0x00, ...data]));
}

function encodeECPublicKey(publicKey: Uint8Array): Uint8Array {
  const algorithmIdentifier = encodeSEQUENCE(
    encodeOID('1.2.840.10045.2.1'), // ecPublicKey OID
    encodeOID('1.2.840.10045.3.1.7') // P-256 curve OID
  );
  return encodeSEQUENCE(algorithmIdentifier, encodeBITSTRING(publicKey));
}

function decodeLength(data: Uint8Array, startIndex: number): [number, number] {
  if (data[startIndex] < 128) {
    return [data[startIndex], 1];
  }
  const octets = data[startIndex] & 0x7f;
  let length = 0;
  for (let i = 0; i < octets; i++) {
    length = (length << 8) | data[startIndex + 1 + i];
  }
  return [length, 1 + octets];
}

function decodeDER(data: Uint8Array, startIndex: number): [number, Uint8Array, number] {
  const tag = data[startIndex];
  const [length, lengthSize] = decodeLength(data, startIndex + 1);
  const contentStart = startIndex + 1 + lengthSize;
  const content = data.slice(contentStart, contentStart + length);
  return [tag, content, 1 + lengthSize + length];
}
