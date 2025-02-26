import { getCode } from 'viem/actions';

import { createSmartAccount } from './createSmartAccount.js';
import { createSubAccountSigner } from './createSubAccountSigner.js';
import { getOwnerIndex } from './getOwnerIndex.js';
import { getBundlerClient } from ':stores/chain-clients/utils.js';

vi.mock('viem/actions', () => ({
  getCode: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./getOwnerIndex.js', () => ({
  getOwnerIndex: vi.fn(),
}));

vi.mock(':stores/sub-accounts/store.js', () => ({
  subaccounts: {
    getState: vi.fn().mockReturnValue({
      getSigner: vi.fn().mockResolvedValue({
        account: {
          address: '0x',
        },
      }),
      universalAccount: '0x',
      account: {
        address: '0x',
        chainId: 84532,
        ownerIndex: 0,
        factory: '0x',
        factoryData: '0x',
      },
    }),
  },
}));

vi.mock(':stores/chain-clients/utils.js', () => ({
  getBundlerClient: vi.fn().mockReturnValue({}),
  getClient: vi.fn().mockReturnValue({}),
}));

vi.mock('./createSmartAccount.js', () => ({
  createSmartAccount: vi.fn().mockResolvedValue({
    sign: vi.fn(),
    signMessage: vi.fn(),
    signTypedData: vi.fn(),
  }),
}));

vi.mock('./getAccountIndex.js', () => ({
  getAccountIndex: vi.fn().mockResolvedValue(1),
}));

describe('createSubAccountSigner', () => {
  it('should create a signer', async () => {
    const signer = await createSubAccountSigner({
      chainId: 84532,
    });
    expect(signer.request).toBeDefined();
  });

  it('handle send calls', async () => {
    const sendUserOperation = vi.fn();
    (getBundlerClient as any).mockReturnValue({
      sendUserOperation,
    });

    const signer = await createSubAccountSigner({
      chainId: 84532,
    });
    await signer.request({
      method: 'wallet_sendCalls',
      params: [{ chainId: 84532, calls: [{ to: '0x', data: '0x' }] }],
    });

    expect(sendUserOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        calls: [{ to: '0x', data: '0x' }],
        paymaster: undefined,
      })
    );
  });

  it('handle send transaction', async () => {
    const mock = vi.fn();
    (createSmartAccount as any).mockResolvedValue({
      sign: mock,
    });
    const signer = await createSubAccountSigner({
      chainId: 84532,
    });
    await signer.request({
      method: 'eth_sendTransaction',
      params: [{ hash: '0x' }],
    });

    expect(mock).toHaveBeenCalledWith({ hash: '0x' });
  });

  it('handle sign message', async () => {
    const mock = vi.fn();
    (createSmartAccount as any).mockResolvedValue({
      signMessage: mock,
    });
    const signer = await createSubAccountSigner({
      chainId: 84532,
    });
    await signer.request({
      method: 'personal_sign',
      params: ['hello world', '0x123'],
    });

    expect(mock).toHaveBeenCalledWith({ message: 'hello world' });
  });

  it('handle sign typed data', async () => {
    const mock = vi.fn();
    (createSmartAccount as any).mockResolvedValue({
      signTypedData: mock,
    });
    const signer = await createSubAccountSigner({
      chainId: 84532,
    });
    await signer.request({
      method: 'eth_signTypedData_v4',
      params: ['0x123', { hash: '0x' }],
    });

    expect(mock).toHaveBeenCalledWith({ hash: '0x' });
  });

  it('checks the owner index if the contract is deployed', async () => {
    const sendUserOperation = vi.fn();
    (getBundlerClient as any).mockReturnValue({
      sendUserOperation,
    });
    const mockGetOwnerIndex = vi.fn();
    (getCode as any).mockResolvedValue('0x123');

    (getOwnerIndex as any).mockImplementation(mockGetOwnerIndex);

    const signer = await createSubAccountSigner({
      chainId: 84532,
    });
    await signer.request({
      method: 'wallet_sendCalls',
      params: [{ chainId: 84532, calls: [{ to: '0x', data: '0x' }] }],
    });

    expect(mockGetOwnerIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0x',
        publicKey: '0x',
      })
    );
  });
});
