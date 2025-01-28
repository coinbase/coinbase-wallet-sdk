import { Signature, WebCryptoP256 } from 'ox';
import { toHex } from 'viem';

import { authenticatorData, getSigner } from './signer.js';
import { idb } from './storage.js';
import { ACTIVE_SUB_ACCOUNT_ID_KEY, SCWStateManager } from ':sign/scw/SCWStateManager.js';

vi.mock('ox');

describe('signer', () => {
  it('should throw if no active signer is present', async () => {
    SCWStateManager.getItem = vi.fn().mockReturnValue(null);
    await expect(getSigner()).rejects.toThrow('active sub account id not found');
  });

  it('should throw if no keypair is present', async () => {
    SCWStateManager.getItem = vi.fn().mockReturnValue('0x123');
    await expect(getSigner()).rejects.toThrow('keypair not found');
  });

  it('should sign a message', async () => {
    SCWStateManager.setItem(ACTIVE_SUB_ACCOUNT_ID_KEY, '0x123');
    idb.setItem('0x123', {
      keypair: { privateKey: new Uint8Array(), publicKey: new Uint8Array() },
    });

    WebCryptoP256.sign = vi.fn().mockResolvedValue({
      r: new Uint8Array(),
      s: new Uint8Array(),
    });
    Signature.toHex = vi.fn().mockReturnValue('0xSignature');

    const sign = await getSigner();
    const signature = await sign(toHex('Hello, world!'));
    expect(signature).toEqual(
      expect.objectContaining({
        signature: '0xSignature',
        raw: {
          r: new Uint8Array(),
          s: new Uint8Array(),
        },
        webauthn: {
          authenticatorData,
          challengeIndex: 23,
          clientDataJSON:
            '{"type":"webauthn.get","challenge":"undefined","origin":"https://keys.coinbase.com"}',
          typeIndex: 1,
          userVerificationRequired: false,
        },
      })
    );
  });
});
