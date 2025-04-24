import { store } from ':store/store.js';
import { hashTypedData, hexToBigInt, numberToHex } from 'viem';
import {
  SpendPermissionBatch,
  addSenderToRequest,
  assertFetchPermissionsRequest,
  assertParamsChainId,
  createSpendPermissionBatchMessage,
  fillMissingParamsForFetchPermissions,
  getSenderFromRequest,
  initSubAccountConfig,
  injectRequestCapabilities,
} from './utils.js';

describe('utils', () => {
  describe('getSenderFromRequest', () => {
    const sender = '0x123';
    it.each([
      ['eth_signTransaction', [{ from: sender }], sender],
      ['eth_sendTransaction', [{ from: sender }], sender],
      ['wallet_sendCalls', [{ from: sender }], sender],
      ['eth_signTypedData_v4', [sender, {}], sender],
      ['personal_sign', ['message', sender], sender],
    ])('should return the sender from the request for %s', (method, params, sender) => {
      const request = { method, params };
      expect(getSenderFromRequest(request)).toBe(sender);
    });
  });

  describe('addSenderToRequest', () => {
    it.each([
      ['eth_signTransaction', [{}], [{ from: '0x123' }]],
      ['eth_sendTransaction', [{}], [{ from: '0x123' }]],
      ['wallet_sendCalls', [{}], [{ from: '0x123' }]],
      ['eth_signTypedData_v4', [undefined, {}], ['0x123', {}]],
      ['personal_sign', ['hello', undefined], ['hello', '0x123']],
    ])('should enhance the request params for %s', (method, params, expectedParams) => {
      const request = { method, params };
      const sender = '0x123';
      expect(addSenderToRequest(request, sender)).toEqual({
        method,
        params: expectedParams,
      });
    });
  });
});

describe('assertParamsChainId', () => {
  it('should throw if the params are not an array', () => {
    expect(() => assertParamsChainId({})).toThrow();
  });

  it('should throw if the params array is empty', () => {
    expect(() => assertParamsChainId([])).toThrow();
  });

  it('should throw if the first param does not have a chainId property', () => {
    expect(() => assertParamsChainId([{}])).toThrow();
  });

  it('should throw if the chainId is not a string or number', () => {
    expect(() => assertParamsChainId([{ chainId: true }])).toThrow();
    expect(() => assertParamsChainId([{ chainId: null }])).toThrow();
    expect(() => assertParamsChainId([{ chainId: undefined }])).toThrow();
    expect(() => assertParamsChainId([{ chainId: {} }])).toThrow();
  });

  it('should not throw if the chainId is a string', () => {
    expect(() => assertParamsChainId([{ chainId: '0x1' }])).not.toThrow();
  });

  it('should not throw if the chainId is a number', () => {
    expect(() => assertParamsChainId([{ chainId: 1 }])).not.toThrow();
  });

  it('should throw if params is null or undefined', () => {
    expect(() => assertParamsChainId(null)).toThrow();
    expect(() => assertParamsChainId(undefined)).toThrow();
  });
});

describe('injectRequestCapabilities', () => {
  const capabilities = {
    addSubAccount: {
      account: {
        type: 'create',
        keys: [
          {
            type: 'address',
            key: '0x123',
          },
        ],
      },
    },
  };

  it('should merge capabilities for wallet_connect method', () => {
    const siweCapability = {
      chainId: 84532,
      nonce: Math.random().toString(36).substring(2, 15),
    };
    const request = {
      method: 'wallet_connect',
      params: [
        {
          someParam: 'value',
          capabilities: {
            signInWithEthereum: siweCapability,
          },
        },
      ],
    };

    const result = injectRequestCapabilities(request, capabilities);
    expect(result).toEqual({
      method: 'wallet_connect',
      params: [
        {
          someParam: 'value',
          capabilities: {
            ...capabilities,
            signInWithEthereum: siweCapability,
          },
        },
      ],
    });
  });

  it('should merge capabilities for wallet_sendCalls method', () => {
    const paymasterCapability = {
      url: 'https://paymaster.example.com',
    };
    const request = {
      method: 'wallet_sendCalls',
      params: [
        {
          version: '1.0',
          existingParam: 'test',
          capabilities: {
            paymasterService: paymasterCapability,
          },
        },
      ],
    };

    const result = injectRequestCapabilities(request, capabilities);
    expect(result).toEqual({
      method: 'wallet_sendCalls',
      params: [
        {
          version: '1.0',
          existingParam: 'test',
          capabilities: {
            ...capabilities,
            paymasterService: paymasterCapability,
          },
        },
      ],
    });
  });

  it('should not modify request for other methods', () => {
    const request = {
      method: 'eth_sendTransaction',
      params: [{ someParam: 'value' }],
    };

    const result = injectRequestCapabilities(request, capabilities);
    expect(result).toEqual(request);
  });

  it('should throw if capabilities is not an object', () => {
    const request = {
      method: 'wallet_sendCalls',
      params: [
        {
          capabilities: 'invalid',
        },
      ],
    };

    expect(() => injectRequestCapabilities(request, capabilities)).toThrow();
  });
});

describe('initSubAccountConfig', () => {
  it('should initialize the sub account config', async () => {
    store.subAccountsConfig.set({
      enableAutoSubAccounts: true,
      toOwnerAccount: vi.fn().mockResolvedValue({
        account: {
          address: '0x123',
          type: 'local',
        },
      }),
    });

    await initSubAccountConfig();

    const config = store.subAccountsConfig.get();
    expect(config?.capabilities?.addSubAccount).toBeDefined();
  });
});

describe('assertFetchPermissionsRequest', () => {
  it('should throw if the request is not a fetch permissions request', () => {
    expect(() => assertFetchPermissionsRequest({ method: 'eth_sendTransaction' })).toThrow();
  });

  it('should throw if the request params are the correct shape', () => {
    expect(() =>
      assertFetchPermissionsRequest({
        method: 'coinbase_fetchPermissions',
        params: [{ account: 'non-hex-string' }],
      })
    ).toThrow();
  });

  it('should pass if the params is omitted completely', () => {
    expect(() =>
      assertFetchPermissionsRequest({ method: 'coinbase_fetchPermissions' })
    ).not.toThrow();
  });

  it('should pass if the params is correct shape', () => {
    expect(() =>
      assertFetchPermissionsRequest({
        method: 'coinbase_fetchPermissions',
        params: [{ account: '0x123', chainId: '0x123', spender: '0x123' }],
      })
    ).not.toThrow();
  });
});

describe('fillMissingParamsForFetchPermissions', () => {
  it('should return the request if the params are present', () => {
    const request = {
      method: 'coinbase_fetchPermissions',
      params: [{ account: '0x123', chainId: '0x123', spender: '0x123' }],
    };
    assertFetchPermissionsRequest(request);
    expect(fillMissingParamsForFetchPermissions(request)).toEqual(request);
  });

  it('should fill in the missing params if the params are not present', () => {
    vi.spyOn(store, 'getState').mockImplementation(() => ({
      account: {
        accounts: ['0x123'],
        chain: { id: 1 },
      },
      subAccount: { address: '0x456' },
      chains: [],
      keys: {},
      spendLimits: {},
      config: {
        version: '1.0.0',
      },
    }));
    const request = {
      method: 'coinbase_fetchPermissions',
    };
    assertFetchPermissionsRequest(request);
    expect(fillMissingParamsForFetchPermissions(request)).toEqual({
      method: 'coinbase_fetchPermissions',
      params: [{ account: '0x123', chainId: '0x1', spender: '0x456' }],
    });
  });
});

describe('createSpendPermissionBatchMessage', () => {
  it('should create a correctly structured batch message that produces the expected hash', () => {
    const spendPermissionBatch: SpendPermissionBatch = {
      account: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      period: 86400,
      start: 1745516872,
      end: 1748108872,
      permissions: [
        {
          spender: '0xabcdef0123456789abcdef0123456789abcdef01' as `0x${string}`,
          token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`,
          allowance: numberToHex(BigInt('1000000000000')),
          salt: '0x1',
          extraData: '0x',
        },
        {
          spender: '0x2222222222222222222222222222222222222222' as `0x${string}`,
          token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`,
          allowance: numberToHex(BigInt('1000000000000000000')),
          salt: '0x2',
          extraData: '0x1234',
        },
      ],
    } as const;

    const message = createSpendPermissionBatchMessage({
      spendPermissionBatch,
      chainId: 8453, // Using mainnet chain ID
    });

    // Convert hex values to bigint for EIP-712 typed data
    const typedDataMessage = {
      ...message.message,
      permissions: message.message.permissions.map((p) => ({
        ...p,
        allowance: hexToBigInt(p.allowance),
        salt: hexToBigInt(p.salt),
      })),
    };

    const hash = hashTypedData({
      domain: message.domain,
      types: message.types,
      primaryType: message.primaryType,
      message: typedDataMessage,
    });

    expect(hash).toEqual('0x010415415ed40b5f566f89869e2aa4cd26c6af3b22710dda12c6bd1c906095d3');
  });
});
