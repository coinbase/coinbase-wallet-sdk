import { Signature, WebAuthnP256 } from 'ox';
import { ByteArray, Hex, hexToBytes, numberToHex, stringToBytes, trim } from 'viem';

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
      signature: arrayBufferToBase64Url(asn1EncodeSignature(signatureRaw.r, signatureRaw.s)),
    },
    type: JSON.parse(webauthn.clientDataJSON).type,
  };
}

export function asn1EncodeSignature(r: bigint, s: bigint): Uint8Array {
  // Convert r and s to byte arrays and remove any leading zeros
  const rBytes = hexToBytes(trim(numberToHex(r)));
  const sBytes = hexToBytes(trim(numberToHex(s)));

  // Calculate lengths
  const rLength = rBytes.length;
  const sLength = sBytes.length;
  const totalLength = rLength + sLength + 4; // 4 additional bytes for type and length fields

  // Create the signature buffer
  const signature = new Uint8Array(totalLength + 2); // +2 for sequence header

  // Sequence header
  signature[0] = 0x30; // ASN.1 sequence tag
  signature[1] = totalLength;

  // Encode r value
  signature[2] = 0x02; // ASN.1 integer tag
  signature[3] = rLength;
  signature.set(rBytes, 4);

  // Encode s value
  signature[rLength + 4] = 0x02; // ASN.1 integer tag
  signature[rLength + 5] = sLength;
  signature.set(sBytes, rLength + 6);

  return signature;
}
