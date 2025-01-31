import { AbiParameters, Base64, Hash, Hex, PublicKey, Signature, WebCryptoP256 } from 'ox';
import { hashMessage, hashTypedData } from 'viem';
import type { WebAuthnAccount } from 'viem/account-abstraction';

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

export const ACCOUNT_TYPE = 'webAuthn';

export const authenticatorData =
  '0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000' as const;

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
    const challengeBase64 = Base64.fromHex(payload, { url: true, pad: false });
    const clientDataJSON = `{"type":"webauthn.get","challenge":"${challengeBase64}","origin":"https://keys.coinbase.com"}`;
    const challengeIndex = clientDataJSON.indexOf('"challenge":');
    const typeIndex = clientDataJSON.indexOf('"type":');
    const clientDataJSONHash = Hash.sha256(Hex.fromString(clientDataJSON));
    const message = AbiParameters.encodePacked(
      ['bytes', 'bytes32'],
      [authenticatorData, clientDataJSONHash]
    );
    const signature = await WebCryptoP256.sign({
      payload: message,
      privateKey: keypair.privateKey,
    });
    return {
      signature: Signature.toHex(signature),
      raw: signature as unknown as PublicKeyCredential, // type changed in viem
      webauthn: {
        authenticatorData,
        challengeIndex,
        clientDataJSON,
        typeIndex,
        userVerificationRequired: false,
      },
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
