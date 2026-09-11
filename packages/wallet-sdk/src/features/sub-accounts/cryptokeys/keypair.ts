import { Hex, PublicKey, WebCryptoP256 } from 'ox';

export type SubAccountCryptoKeyPair = {
  privateKey: CryptoKey;
  publicKey: PublicKey.PublicKey;
};

/////////////////////////////////////////////////////////////////////////////////////////////
// Key management
/////////////////////////////////////////////////////////////////////////////////////////////
export async function generateKeypair(): Promise<SubAccountCryptoKeyPair> {
  return WebCryptoP256.createKeyPair({ extractable: false });
}

type SubAccountKeypair = {
  id: string;
  keypair: SubAccountCryptoKeyPair;
  publicKey: string;
};

export async function generateSubAccountKeypair(): Promise<SubAccountKeypair> {
  const keypair = await generateKeypair();
  const publicKey = Hex.slice(PublicKey.toHex(keypair.publicKey), 1);
  return {
    id: publicKey,
    keypair,
    publicKey,
  };
}
