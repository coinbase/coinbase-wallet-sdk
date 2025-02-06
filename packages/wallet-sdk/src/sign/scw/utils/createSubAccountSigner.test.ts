import { toCoinbaseSmartAccount } from 'viem/account-abstraction';

import { createSubAccountSigner } from './createSubAccountSigner.js';
import { getBundlerClient } from ':stores/chain-clients/utils.js';
import { SubAccountInfo } from ':stores/sub-accounts/store.js';

const params: SubAccountInfo = {
  address: '0x',
  chainId: 84532,
  owners: [],
  root: '0x',
  initCode: {
    factory: '0x',
    factoryCalldata: '0x',
  },
};

vi.mock(':stores/sub-accounts/store.js', () => ({
  subaccounts: {
    getState: vi.fn().mockReturnValue({
      getSigner: vi.fn().mockResolvedValue('0x1'),
      account: {
        address: '0x',
        chainId: 84532,
        owners: [],
        ownerIndex: 0,
        root: '0x',
        initCode: {
          factory: '0x',
          factoryCalldata: '0x',
        },
      },
    }),
  },
}));

vi.mock(':stores/chain-clients/utils.js', () => ({
  getBundlerClient: vi.fn().mockReturnValue({}),
  getClient: vi.fn().mockReturnValue({}),
}));

vi.mock('viem/account-abstraction', () => ({
  toCoinbaseSmartAccount: vi.fn().mockResolvedValue({}),
}));

describe('createSubAccountSigner', () => {
  it('should create a signer', async () => {
    const signer = await createSubAccountSigner(params);
    expect(signer.request).toBeDefined();
  });

  it('handle send calls', async () => {
    const sendUserOperation = vi.fn();
    (getBundlerClient as any).mockReturnValue({
      sendUserOperation,
    });

    const signer = await createSubAccountSigner(params);
    await signer.request({
      method: 'wallet_sendCalls',
      params: [{ chainId: 84532, calls: [{ to: '0x', data: '0x' }] }],
    });

    expect(sendUserOperation).toHaveBeenCalledWith({
      account: {},
      calls: [{ to: '0x', data: '0x' }],
      paymaster: undefined,
    });
  });

  it('handle send transaction', async () => {
    const mock = vi.fn();
    (toCoinbaseSmartAccount as any).mockResolvedValue({
      sign: mock,
    });
    const signer = await createSubAccountSigner(params);
    await signer.request({
      method: 'eth_sendTransaction',
      params: [{ hash: '0x' }],
    });

    expect(mock).toHaveBeenCalledWith({ hash: '0x' });
  });

  it('handle sign message', async () => {
    const mock = vi.fn();
    (toCoinbaseSmartAccount as any).mockResolvedValue({
      signMessage: mock,
    });
    const signer = await createSubAccountSigner(params);
    await signer.request({
      method: 'personal_sign',
      params: ['hello world', '0x123'],
    });

    expect(mock).toHaveBeenCalledWith({ message: 'hello world' });
  });

  it('handle sign typed data', async () => {
    const mock = vi.fn();
    (toCoinbaseSmartAccount as any).mockResolvedValue({
      signTypedData: mock,
    });
    const signer = await createSubAccountSigner(params);
    await signer.request({
      method: 'eth_signTypedData_v4',
      params: ['0x123', { hash: '0x' }],
    });

    expect(mock).toHaveBeenCalledWith({ hash: '0x' });
  });
});
