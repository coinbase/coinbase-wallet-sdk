import { Signature, WebAuthnP256 } from 'ox';
import { ByteArray, Hex, hexToBytes, stringToBytes } from 'viem';

export function base64ToBase64Url(base64: string): string {
  return base64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function arrayBufferToBase64Url(buffer: ArrayBuffer | ByteArray): string {
  // First convert to regular base64
  const base64String = btoa(String.fromCharCode(...new Uint8Array(buffer)));

  // Then convert to base64url
  return base64ToBase64Url(base64String);
}

export function convertCredentialToJSON({
  webauthn,
  signature,
  id,
}: {
  signature: Hex;
  webauthn: WebAuthnP256.SignMetadata;
  id: string;
}) {
  const signatureRaw = Signature.fromHex(signature);
  return {
    id,
    rawId: arrayBufferToBase64Url(stringToBytes(id)),
    response: {
      authenticatorData: arrayBufferToBase64Url(hexToBytes(webauthn.authenticatorData)),
      clientDataJSON: arrayBufferToBase64Url(stringToBytes(webauthn.clientDataJSON)),
      signature: arrayBufferToBase64Url(Signature.toDerBytes(signatureRaw)),
    },
    type: JSON.parse(webauthn.clientDataJSON).type,
  };
}
