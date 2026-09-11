import { AbiParameters, Base64, Hash, Hex, PublicKey, Signature, WebCryptoP256 } from 'ox';

import { SubAccountCryptoKeyPair } from './keypair.js';
import { idb } from './storage.js';
import { ACTIVE_SUB_ACCOUNT_ID_KEY, SCWStateManager } from ':sign/scw/SCWStateManager.js';

/////////////////////////////////////////////////////////////////////////////////////////////
// Constants
/////////////////////////////////////////////////////////////////////////////////////////////
export const type = 'webAuthn';

export const authenticatorData =
  '0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000' as const;

/////////////////////////////////////////////////////////////////////////////////////////////
// Utility
/////////////////////////////////////////////////////////////////////////////////////////////
async function getActiveSubAccountKeypair() {
  const id = SCWStateManager.getItem(ACTIVE_SUB_ACCOUNT_ID_KEY);
  if (!id) {
    throw new Error('active sub account id not found');
  }
  const keypair = await idb.getItem<{ keypair: SubAccountCryptoKeyPair }>(id);
  if (!keypair) {
    throw new Error('keypair not found');
  }
  return keypair.keypair;
}

/////////////////////////////////////////////////////////////////////////////////////////////
// Implementation
/////////////////////////////////////////////////////////////////////////////////////////////
export async function getSigner() {
  const keypair = await getActiveSubAccountKeypair();
  if (!keypair) {
    throw new Error('keypair not found');
  }
  return async (payload: Hex.Hex) => {
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
}

export async function getAddress() {
  const keypair = await getActiveSubAccountKeypair();
  if (!keypair) {
    throw new Error('keypair not found');
  }
  return Hex.slice(PublicKey.toHex(keypair.publicKey), 1);
}
