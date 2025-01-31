import { Hex, PublicKey, Signature, WebAuthnP256, WebCryptoP256 } from 'ox';
import { hashMessage, hashTypedData } from 'viem';
import { type WebAuthnAccount } from 'viem/account-abstraction';

import { createStorage } from './storage.js';

export type P256KeyPair = {
  privateKey: CryptoKey;
  publicKey: PublicKey.PublicKey;
};

/////////////////////////////////////////////////////////////////////////////////////////////
// Constants
/////////////////////////////////////////////////////////////////////////////////////////////
export const STORAGE_SCOPE = 'CBWSDK';
export const STORAGE_NAME = 'CryptoKeys';

export const ACTIVE_ID_KEY = 'activeId';

/////////////////////////////////////////////////////////////////////////////////////////////
// Storage
/////////////////////////////////////////////////////////////////////////////////////////////
export const storage = createStorage(STORAGE_SCOPE, STORAGE_NAME);

/////////////////////////////////////////////////////////////////////////////////////////////
// Functions
/////////////////////////////////////////////////////////////////////////////////////////////
export async function generateKeyPair(): Promise<P256KeyPair> {
  const keypair = await WebCryptoP256.createKeyPair({ extractable: false });
  const publicKey = Hex.slice(PublicKey.toHex(keypair.publicKey), 1);

  await storage.setItem(publicKey, keypair);
  await storage.setItem(ACTIVE_ID_KEY, publicKey);

  return keypair;
}

export async function getKeypair(): Promise<P256KeyPair | null> {
  const id = await storage.getItem<string>(ACTIVE_ID_KEY);
  if (!id) {
    return null;
  }
  const keypair = await storage.getItem<P256KeyPair>(id);
  if (!keypair) {
    return null;
  }
  return keypair;
}

export async function getCryptoKeyAccount(): Promise<WebAuthnAccount> {
  let keypair = await getKeypair();
  if (!keypair) {
    keypair = await generateKeyPair();
    const pubKey = Hex.slice(PublicKey.toHex(keypair.publicKey), 1);
    await storage.setItem(pubKey, keypair);
    await storage.setItem(ACTIVE_ID_KEY, pubKey);
  }

  /**
   * public key / address
   */
  const publicKey = Hex.slice(PublicKey.toHex(keypair.publicKey), 1);

  /**
   * signer
   */
  const sign = async (payload: Hex.Hex) => {
    const { payload: message, metadata } = WebAuthnP256.getSignPayload({
      challenge: payload,
      origin: 'https://keys.coinbase.com',
      userVerification: 'preferred',
    });
    const signature = await WebCryptoP256.sign({
      payload: message,
      privateKey: keypair.privateKey,
    });
    return {
      signature: Signature.toHex(signature),
      raw: {} as unknown as PublicKeyCredential, // type changed in viem
      webauthn: metadata,
    };
  };

  return {
    id: publicKey,
    publicKey,
    async sign({ hash }) {
      return sign(hash);
    },
    async signMessage({ message }) {
      return sign(hashMessage(message));
    },
    async signTypedData(parameters) {
      return sign(hashTypedData(parameters));
    },
    type: 'webAuthn',
  };
}
