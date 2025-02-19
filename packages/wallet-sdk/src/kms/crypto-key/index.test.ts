import { Hex, PublicKey } from 'ox';
import { type LocalAccount, type OneOf } from 'viem';
import { WebAuthnAccount } from 'viem/account-abstraction';

import { generateKeyPair, getCryptoKeyAccount, getKeypair, storage } from './index.js';

function assertWebAuthnAccount(
  account: OneOf<WebAuthnAccount | LocalAccount> | null
): asserts account is WebAuthnAccount {
  if (!account) {
    throw new Error('account is null');
  }

  if (account.type !== 'webAuthn') {
    throw new Error('account is not a webAuthn account');
  }
}

describe('crypto-key', () => {
  it('should generate a key pair', async () => {
    const keypair = await generateKeyPair();
    expect(keypair.privateKey).toBeDefined();
    expect(keypair.publicKey).toBeDefined();
  });

  it('should return null if no key pair is found', async () => {
    vi.spyOn(storage, 'getItem').mockResolvedValue(null);

    const keypair = await getKeypair();
    expect(keypair).toBeNull();
  });

  it('should return the keypair if found', async () => {
    const mockKeypair = await generateKeyPair();
    vi.spyOn(storage, 'getItem').mockResolvedValue(mockKeypair);

    const keypair = await getKeypair();
    expect(keypair).toBe(mockKeypair);
  });

  it('should generate a new keypair if no keypair is found', async () => {
    vi.spyOn(storage, 'getItem').mockResolvedValue(null);
    const kp = await getKeypair();
    expect(kp).toBeNull();

    await getCryptoKeyAccount();

    const keypair = await getKeypair();
    expect(keypair).toBeDefined();
  });

  it('should return the account', async () => {
    const mockKeypair = await generateKeyPair();
    const publicKey = Hex.slice(PublicKey.toHex(mockKeypair.publicKey), 1);
    vi.spyOn(storage, 'getItem').mockResolvedValue(mockKeypair);

    const { account } = await getCryptoKeyAccount();

    expect(account).toEqual(
      expect.objectContaining({
        id: publicKey,
        publicKey,
        type: 'webAuthn',
      })
    );
  });

  it('should sign a message', async () => {
    const mockKeypair = await generateKeyPair();
    vi.spyOn(storage, 'getItem').mockResolvedValue(mockKeypair);

    const { account } = await getCryptoKeyAccount();
    assertWebAuthnAccount(account);

    const signature = await account.signMessage({ message: 'Hello, world!' });

    expect(signature).toEqual(
      expect.objectContaining({
        signature: expect.any(String),
      })
    );
  });

  it('should sign a typed data', async () => {
    const mockKeypair = await generateKeyPair();
    vi.spyOn(storage, 'getItem').mockResolvedValue(mockKeypair);

    const { account } = await getCryptoKeyAccount();
    assertWebAuthnAccount(account);

    const signature = await account.signTypedData({
      primaryType: 'Test',
      domain: {
        name: 'Test',
      },
      types: {
        Test: [{ name: 'foo', type: 'string' }],
      },
      message: {
        foo: 'bar',
      },
    });

    expect(signature).toEqual(
      expect.objectContaining({
        signature: expect.any(String),
      })
    );
  });

  it('should sign', async () => {
    const mockKeypair = await generateKeyPair();
    vi.spyOn(storage, 'getItem').mockResolvedValue(mockKeypair);

    const { account } = await getCryptoKeyAccount();
    assertWebAuthnAccount(account);

    const signature = await account.sign({
      hash: '0x123',
    });

    expect(signature).toEqual(
      expect.objectContaining({
        signature: expect.any(String),
      })
    );
  });
});
