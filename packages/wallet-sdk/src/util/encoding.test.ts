import { Signature } from 'ox';
import { arrayBufferToBase64Url, base64ToBase64Url, convertCredentialToJSON } from './encoding.js';

describe('arrayBufferToBase64Url', () => {
  it('should convert an array buffer to a base64 url equivalent to using Buffer.from', () => {
    const originalBuffer = Buffer.from('hello world');
    const arrayBuffer = new Uint8Array(originalBuffer).buffer;

    const base64Url = arrayBufferToBase64Url(arrayBuffer);
    expect(base64Url).toBe(base64ToBase64Url(originalBuffer.toString('base64')));
  });
});

describe('convertCredentialToJSON', () => {
  const mockWebauthn = {
    authenticatorData:
      '0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d9763' as const,
    clientDataJSON: JSON.stringify({ type: 'webauthn.get', challenge: 'test' }),
    challengeIndex: 23,
    typeIndex: 1,
    userVerificationRequired: false,
  };

  /**
   * Helper to decode base64url to bytes for inspection
   */
  function base64UrlToBytes(base64url: string): Uint8Array {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    return new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
  }

  /**
   * Parse DER signature and extract r and s byte arrays
   */
  function parseDerSignature(derBytes: Uint8Array): {
    isValid: boolean;
    rBytes: Uint8Array;
    sBytes: Uint8Array;
  } | null {
    if (derBytes[0] !== 0x30) return null; // Not a SEQUENCE
    if (derBytes[2] !== 0x02) return null; // First element not INTEGER

    const rLength = derBytes[3];
    const rStart = 4;
    const rBytes = derBytes.slice(rStart, rStart + rLength);

    const sOffset = rStart + rLength;
    if (derBytes[sOffset] !== 0x02) return null; // Second element not INTEGER

    const sLength = derBytes[sOffset + 1];
    const sStart = sOffset + 2;
    const sBytes = derBytes.slice(sStart, sStart + sLength);

    return { isValid: true, rBytes, sBytes };
  }

  it('should produce valid DER-encoded signature', () => {
    const signature = Signature.toHex({
      r: BigInt('0x6e100a352ec6ad1b70802290e18aeed190704973570f3b8ed42cb9808e2ea6bf'),
      s: BigInt('0x4a90a229a244495b41890987806fcbd2d5d23fc0dbe5f5256c2613c039d76db8'),
      yParity: 1,
    });

    const result = convertCredentialToJSON({
      webauthn: mockWebauthn,
      signature,
      id: 'test-credential-id',
    });

    expect(result.response.signature).toBeDefined();
    expect(typeof result.response.signature).toBe('string');

    // Decode and verify DER structure
    const derBytes = base64UrlToBytes(result.response.signature);
    expect(derBytes[0]).toBe(0x30); // SEQUENCE tag
  });

  it('should add 0x00 padding when r has high bit set (required for positive INTEGER)', () => {
    // r starts with 0x8e (binary 10001110) - high bit IS set
    // DER requires 0x00 prefix to indicate this is a positive number
    const r = BigInt('0x8e100a352ec6ad1b70802290e18aeed190704973570f3b8ed42cb9808e2ea6bf');
    const s = BigInt('0x4a90a229a244495b41890987806fcbd2d5d23fc0dbe5f5256c2613c039d76db8');

    const signature = Signature.toHex({ r, s, yParity: 1 });

    const result = convertCredentialToJSON({
      webauthn: mockWebauthn,
      signature,
      id: 'test-credential-id',
    });

    const derBytes = base64UrlToBytes(result.response.signature);
    const parsed = parseDerSignature(derBytes);

    expect(parsed).not.toBeNull();
    // r MUST have 0x00 padding because its first byte (0x8e) has high bit set
    expect(parsed!.rBytes[0]).toBe(0x00);
    expect(parsed!.rBytes[1]).toBe(0x8e);
  });

  it('should add 0x00 padding when s has high bit set', () => {
    // s starts with 0xca (binary 11001010) - high bit IS set
    const r = BigInt('0x6e100a352ec6ad1b70802290e18aeed190704973570f3b8ed42cb9808e2ea6bf');
    const s = BigInt('0xca90a229a244495b41890987806fcbd2d5d23fc0dbe5f5256c2613c039d76db8');

    const signature = Signature.toHex({ r, s, yParity: 1 });

    const result = convertCredentialToJSON({
      webauthn: mockWebauthn,
      signature,
      id: 'test-credential-id',
    });

    const derBytes = base64UrlToBytes(result.response.signature);
    const parsed = parseDerSignature(derBytes);

    expect(parsed).not.toBeNull();
    // s MUST have 0x00 padding because its first byte (0xca) has high bit set
    expect(parsed!.sBytes[0]).toBe(0x00);
    expect(parsed!.sBytes[1]).toBe(0xca);
  });

  it('should NOT add 0x00 padding when high bit is not set', () => {
    // r starts with 0x6e (binary 01101110) - high bit NOT set
    // s starts with 0x4a (binary 01001010) - high bit NOT set
    // Neither should have 0x00 padding
    const r = BigInt('0x6e100a352ec6ad1b70802290e18aeed190704973570f3b8ed42cb9808e2ea6bf');
    const s = BigInt('0x4a90a229a244495b41890987806fcbd2d5d23fc0dbe5f5256c2613c039d76db8');

    const signature = Signature.toHex({ r, s, yParity: 1 });

    const result = convertCredentialToJSON({
      webauthn: mockWebauthn,
      signature,
      id: 'test-credential-id',
    });

    const derBytes = base64UrlToBytes(result.response.signature);
    const parsed = parseDerSignature(derBytes);

    expect(parsed).not.toBeNull();
    // Neither r nor s should have 0x00 padding since their high bits are not set
    expect(parsed!.rBytes[0]).toBe(0x6e); // No padding, starts directly with value
    expect(parsed!.sBytes[0]).toBe(0x4a); // No padding, starts directly with value
  });

  it('should handle edge case where r or s is small (fewer than 32 bytes)', () => {
    // Small values that don't need full 32 bytes
    const signature = Signature.toHex({
      r: BigInt('0x123456'),
      s: BigInt('0x7bcdef'), // starts with 0x7b, high bit NOT set
      yParity: 0,
    });

    const result = convertCredentialToJSON({
      webauthn: mockWebauthn,
      signature,
      id: 'test-credential-id',
    });

    const derBytes = base64UrlToBytes(result.response.signature);
    const parsed = parseDerSignature(derBytes);

    expect(parsed).not.toBeNull();
    expect(parsed!.rBytes[0]).toBe(0x12); // No padding needed
    expect(parsed!.sBytes[0]).toBe(0x7b); // No padding needed
  });

  it('should handle small value with high bit set', () => {
    // Small value 0xabcdef starts with 0xab (high bit set) - needs padding
    const signature = Signature.toHex({
      r: BigInt('0x123456'),
      s: BigInt('0xabcdef'), // starts with 0xab, high bit IS set
      yParity: 0,
    });

    const result = convertCredentialToJSON({
      webauthn: mockWebauthn,
      signature,
      id: 'test-credential-id',
    });

    const derBytes = base64UrlToBytes(result.response.signature);
    const parsed = parseDerSignature(derBytes);

    expect(parsed).not.toBeNull();
    expect(parsed!.rBytes[0]).toBe(0x12); // No padding needed
    // s needs padding because 0xab has high bit set
    expect(parsed!.sBytes[0]).toBe(0x00);
    expect(parsed!.sBytes[1]).toBe(0xab);
  });

  it('should include all required credential fields', () => {
    const signature = Signature.toHex({
      r: BigInt('0x6e100a352ec6ad1b70802290e18aeed190704973570f3b8ed42cb9808e2ea6bf'),
      s: BigInt('0x4a90a229a244495b41890987806fcbd2d5d23fc0dbe5f5256c2613c039d76db8'),
      yParity: 1,
    });

    const result = convertCredentialToJSON({
      webauthn: mockWebauthn,
      signature,
      id: 'test-credential-id',
    });

    expect(result.id).toBe('test-credential-id');
    expect(result.rawId).toBeDefined();
    expect(result.response.authenticatorData).toBeDefined();
    expect(result.response.clientDataJSON).toBeDefined();
    expect(result.response.signature).toBeDefined();
    expect(result.type).toBe('webauthn.get');
  });
});
