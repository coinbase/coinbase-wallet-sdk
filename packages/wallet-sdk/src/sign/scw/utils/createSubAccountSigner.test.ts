import { OwnerAccount } from ':core/type/index.js';
import { getClient } from ':store/chain-clients/utils.js';
import { Signature } from 'ox';
import { numberToHex, toHex } from 'viem';
import { createSmartAccount } from './createSmartAccount.js';
import { createSubAccountSigner } from './createSubAccountSigner.js';

vi.mock('viem/actions', () => ({
  getCode: vi.fn().mockResolvedValue(undefined),
}));

vi.mock(':store/store.js', () => ({
  store: {
    getState: vi.fn().mockReturnValue({
      subAccount: {
        address: '0x',
        factory: '0x',
        factoryData: '0x',
      },
    }),
    subAccounts: {
      get: vi.fn().mockReturnValue({
        address: '0x',
        factory: '0x',
        factoryData: '0x',
      }),
    },
    subAccountsConfig: {
      get: vi.fn().mockReturnValue({
        toOwnerAccount: vi.fn().mockResolvedValue({
          account: {
            address: '0x',
            type: 'local',
            sign: vi.fn().mockResolvedValue,
          },
        }),
      }),
    },
  },
  config: {
    get: vi.fn().mockReturnValue({}),
  },
}));

vi.mock(':store/chain-clients/utils.js', () => ({
  getBundlerClient: vi.fn().mockReturnValue({}),
  getClient: vi.fn().mockReturnValue({
    request: vi.fn(),
    chain: {
      id: 84532,
    },
  }),
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
  let owner = {
    address: '0x',
    publicKey: '0x',
    type: 'webAuthn',
    sign: vi.fn().mockResolvedValue({
      webauthn: {
        authenticatorData: '0x',
        clientDataJSON: JSON.stringify({
          type: 'webauthn',
        }),
      },
      signature: Signature.toHex({
        r: BigInt('49782753348462494199823712700004552394425719014458918871452329774910450607807'),
        s: BigInt('33726695977844476214676913201140481102225469284307016937915595756355928419768'),
        yParity: 1,
      }),
    }),
  } as unknown as OwnerAccount;

  it('should create a signer', async () => {
    const signer = await createSubAccountSigner({
      address: '0x',
      client: getClient(84532)!,
      owner,
    });
    expect(signer.request).toBeDefined();
  });

  it('handle send calls', async () => {
    // Mock store subaccount sign method
    const request = vi.fn((args) => {
      if (args.method === 'wallet_prepareCalls') {
        return {
          signatureRequest: {
            hash: '0x',
          },
          type: '0x',
          userOp: '0x',
          chainId: numberToHex(84532),
        };
      }

      if (args.method === 'wallet_sendPreparedCalls') {
        return ['0x'];
      }
      return undefined;
    });

    (getClient as any).mockReturnValue({
      request,
      chain: {
        id: 84532,
      },
    });

    const signer = await createSubAccountSigner({
      address: '0x',
      client: getClient(84532)!,
      owner,
    });

    await signer.request({
      method: 'wallet_sendCalls',
      params: [
        {
          chainId: numberToHex(84532),
          calls: [
            {
              to: '0x',
              data: '0x',
            },
          ],
          from: '0x',
          version: '1.0',
        },
      ],
    });

    expect(request).toHaveBeenCalledWith({
      method: 'wallet_prepareCalls',
      params: [
        {
          calls: [{ to: '0x', data: '0x' }],
          capabilities: {},
          chainId: numberToHex(84532),
          from: '0x',
          version: '1.0',
        },
      ],
    });

    expect(request).toHaveBeenCalledWith({
      method: 'wallet_sendPreparedCalls',
      params: [
        {
          version: '1.0',
          type: '0x',
          data: '0x',
          chainId: numberToHex(84532),
          signature: { type: 'webauthn', data: expect.any(Object) },
        },
      ],
    });
  });

  it('handle send calls with funding capability if parentAddress is provided', async () => {
    // Mock store subaccount sign method
    const request = vi.fn((args) => {
      if (args.method === 'wallet_prepareCalls') {
        return {
          signatureRequest: {
            hash: '0x',
          },
          type: '0x',
          userOp: '0x',
          chainId: numberToHex(84532),
        };
      }

      if (args.method === 'wallet_sendPreparedCalls') {
        return ['0x'];
      }
      return undefined;
    });

    (getClient as any).mockReturnValue({
      request,
      chain: {
        id: 84532,
      },
    });

    const signer = await createSubAccountSigner({
      address: '0x',
      client: getClient(84532)!,
      owner,
      parentAddress: '0x',
    });

    await signer.request({
      method: 'wallet_sendCalls',
      params: [
        {
          chainId: numberToHex(84532),
          calls: [
            {
              to: '0x',
              data: '0x',
            },
          ],
          from: '0x',
          version: '1.0',
        },
      ],
    });

    expect(request).toHaveBeenCalledWith({
      method: 'wallet_prepareCalls',
      params: [
        {
          calls: [{ to: '0x', data: '0x' }],
          capabilities: {
            funding: [
              {
                type: 'spendPermission',
                data: {
                  autoApply: true,
                  sources: ['0x'],
                  preference: 'PREFER_DIRECT_BALANCE',
                },
              },
            ],
          },
          chainId: numberToHex(84532),
          from: '0x',
          version: '1.0',
        },
      ],
    });
  });

  it('handle send transaction', async () => {
    const mock = vi.fn();
    (createSmartAccount as any).mockResolvedValue({
      sign: mock,
    });

    const request = vi.fn((args) => {
      if (args.method === 'wallet_prepareCalls') {
        return {
          signatureRequest: {
            hash: '0x',
          },
          type: '0x',
          userOp: '0x',
          chainId: numberToHex(84532),
        };
      }

      if (args.method === 'wallet_sendPreparedCalls') {
        return ['0x'];
      }

      if (args.method === 'wallet_getCallsStatus') {
        return {
          status: 'CONFIRMED',
          receipts: [
            {
              logs: [],
              status: 1,
              blockHash: '0x',
              blockNumber: 1,
              gasUsed: 130161,
              transactionHash: '0x',
            },
          ],
        };
      }

      return undefined;
    });

    (getClient as any).mockReturnValue({
      request,
      chain: {
        id: 84532,
      },
    });

    const signer = await createSubAccountSigner({
      address: '0x',
      client: getClient(84532)!,
      owner,
    });
    const result = await signer.request({
      method: 'eth_sendTransaction',
      params: [{ to: '0x', data: '0x' }],
    });

    expect(result).toBe('0x');
  });

  it('handle sign message', async () => {
    const mock = vi.fn();
    (createSmartAccount as any).mockResolvedValue({
      signMessage: mock,
    });
    const signer = await createSubAccountSigner({
      address: '0x',
      client: getClient(84532)!,
      owner,
    });
    const message = 'hello world';
    const hexMessage = toHex(message);
    await signer.request({
      method: 'personal_sign',
      params: [hexMessage, '0x'],
    });

    expect(mock).toHaveBeenCalledWith({ message});
  });

  it('handle sign typed data', async () => {
    const mock = vi.fn();
    (createSmartAccount as any).mockResolvedValue({
      signTypedData: mock,
    });
    const signer = await createSubAccountSigner({
      address: '0x',
      client: getClient(84532)!,
      owner,
    });
    await signer.request({
      method: 'eth_signTypedData_v4',
      params: ['0x123', { hash: '0x' }],
    });

    expect(mock).toHaveBeenCalledWith({ hash: '0x' });
  });

  it('personal_sign calls signMessage with decoded message', async () => {
    const mock = vi.fn();
    (createSmartAccount as any).mockResolvedValue({
      signMessage: mock,
    });

    const signer = await createSubAccountSigner({
      address: '0x',
      client: getClient(84532)!,
      owner,
    });

    const message = 'hello';
    const hexMessage = toHex(message);  

    await signer.request({
      method: 'personal_sign',
      params: [hexMessage, '0x'], // hex encoded "hello"
    });

    expect(mock).toHaveBeenCalledWith({ message });
  });

  it('handles attribution', async () => {
    const request = vi.fn((args) => {
      if (args.method === 'wallet_prepareCalls') {
        return {
          signatureRequest: {
            hash: '0x',
          },
          type: '0x',
          userOp: '0x',
          chainId: numberToHex(84532),
        };
      }

      if (args.method === 'wallet_sendPreparedCalls') {
        return ['0x'];
      }

      if (args.method === 'wallet_getCallsStatus') {
        return {
          status: 'CONFIRMED',
          receipts: [
            {
              logs: [],
              status: 1,
              blockHash: '0x',
              blockNumber: 1,
              gasUsed: 130161,
              transactionHash: '0x',
            },
          ],
        };
      }

      return undefined;
    });
    (getClient as any).mockReturnValue({
      request,
      getChainId: vi.fn().mockResolvedValue(84532),
      chain: {
        id: 84532,
      },
    });

    const signer = await createSubAccountSigner({
      address: '0x',
      client: getClient(84532)!,
      owner,
      attribution: {
        suffix: '0x7890',
      },
    });

    // Typecheck for appOrigin option
    await createSubAccountSigner({
      address: '0x',
      client: getClient(84532)!,
      owner,
      attribution: {
        appOrigin: 'https://app.com',
      },
    });

    await signer.request({
      method: 'wallet_sendCalls',
      params: [
        {
          calls: [{ to: '0x', data: '0x123456' }],
          chainId: numberToHex(84532),
          from: '0x',
          version: '1.0',
        },
      ],
    });

    expect(request).toHaveBeenCalledWith({
      method: 'wallet_prepareCalls',
      params: [
        expect.objectContaining({
          capabilities: expect.objectContaining({ attribution: { suffix: '0x7890' } }),
        }),
      ],
    });
  });
});
