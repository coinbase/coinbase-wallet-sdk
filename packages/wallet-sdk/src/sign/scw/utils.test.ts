import { store } from ':store/store.js';
import { hashTypedData, hexToBigInt, numberToHex } from 'viem';
import {
  SpendPermissionBatch,
  addSenderToRequest,
  assertFetchPermissionsRequest,
  assertGetCapabilitiesParams,
  assertParamsChainId,
  createSpendPermissionBatchMessage,
  createWalletSendCallsRequest,
  fillMissingParamsForFetchPermissions,
  getCachedWalletConnectResponse,
  getSenderFromRequest,
  initSubAccountConfig,
  injectRequestCapabilities,
  prependWithoutDuplicates,
  requestHasCapability,
} from './utils.js';

// Valid Ethereum addresses for testing
const VALID_ADDRESS_1 = '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54';
const VALID_ADDRESS_2 = '0x7838d2724FC686813CAf81d4429beff1110c739a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

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

describe('assertGetCapabilitiesParams', () => {
  it('should throw if params is null or undefined', () => {
    expect(() => assertGetCapabilitiesParams(null)).toThrow();
    expect(() => assertGetCapabilitiesParams(undefined)).toThrow();
  });

  it('should throw if params is not an array', () => {
    expect(() => assertGetCapabilitiesParams({})).toThrow();
    expect(() => assertGetCapabilitiesParams('0x123')).toThrow();
    expect(() => assertGetCapabilitiesParams(123)).toThrow();
  });

  it('should throw if params array is empty', () => {
    expect(() => assertGetCapabilitiesParams([])).toThrow();
  });

  it('should throw if params array has more than 2 elements', () => {
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_1, ['0x1'], 'extra'])).toThrow();
  });

  it('should throw if first param is not a string', () => {
    expect(() => assertGetCapabilitiesParams([123])).toThrow();
    expect(() => assertGetCapabilitiesParams([null])).toThrow();
    expect(() => assertGetCapabilitiesParams([{}])).toThrow();
  });

  it('should throw if first param is not a valid Ethereum address', () => {
    expect(() => assertGetCapabilitiesParams(['123'])).toThrow();
    expect(() => assertGetCapabilitiesParams(['0x123'])).toThrow(); // Too short
    expect(() => assertGetCapabilitiesParams(['0x123abc'])).toThrow(); // Too short
    expect(() => assertGetCapabilitiesParams(['xyz123'])).toThrow(); // No 0x prefix
    expect(() =>
      assertGetCapabilitiesParams(['0x12345678901234567890123456789012345678gg'])
    ).toThrow(); // Invalid hex characters
    expect(() =>
      assertGetCapabilitiesParams(['0x123456789012345678901234567890123456789'])
    ).toThrow(); // Too short (39 chars)
    expect(() =>
      assertGetCapabilitiesParams(['0x12345678901234567890123456789012345678901'])
    ).toThrow(); // Too long (41 chars)
  });

  it('should not throw for valid single parameter (valid Ethereum address)', () => {
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_1])).not.toThrow();
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_2])).not.toThrow();
    expect(() => assertGetCapabilitiesParams([ZERO_ADDRESS])).not.toThrow();
  });

  it('should throw if second param is not an array when present', () => {
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_1, '0x1'])).toThrow();
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_1, 123])).toThrow();
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_1, null])).toThrow();
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_1, {}])).toThrow();
  });

  it('should throw if second param array contains non-hex strings', () => {
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_1, ['0x1', '123']])).toThrow();
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_1, ['0x1', 123]])).toThrow();
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_1, ['0x1', null]])).toThrow();
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_1, ['abc123']])).toThrow();
  });

  it('should not throw for valid parameters with filter array', () => {
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_1, []])).not.toThrow();
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_1, ['0x1']])).not.toThrow();
    expect(() =>
      assertGetCapabilitiesParams([VALID_ADDRESS_1, ['0x1', '0x2', '0x3']])
    ).not.toThrow();
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_1, ['0xabcdef', '0x0']])).not.toThrow();
    expect(() => assertGetCapabilitiesParams([VALID_ADDRESS_2, ['0x1', '0xa']])).not.toThrow();
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
            publicKey: '0x123',
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
      spendPermissions: [],
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

describe('createWalletSendCallsRequest', () => {
  it('should inject paymaster url if provided', () => {
    // mock store config
    vi.spyOn(store.config, 'get').mockReturnValue({
      paymasterUrls: {
        1: 'https://paymaster.example.com',
      },
      version: '1.0.0',
    });

    const request = createWalletSendCallsRequest({
      calls: [
        {
          to: '0x123',
          data: '0x123',
          value: '0x123',
        },
      ],
      from: '0x123',
      chainId: 1,
    });

    expect(request).toEqual({
      method: 'wallet_sendCalls',
      params: [
        expect.objectContaining({
          capabilities: {
            paymasterService: { url: 'https://paymaster.example.com' },
          },
        }),
      ],
    });
  });
});

describe('requestCapabilities', () => {
  describe('requestHasCapability', () => {
    it('returns false for requests without params', () => {
      expect(requestHasCapability({} as any, 'test')).toBe(false);
      expect(requestHasCapability({ params: null } as any, 'test')).toBe(false);
    });

    it('returns false for requests without capabilities', () => {
      expect(requestHasCapability({ params: [] } as any, 'test')).toBe(false);
      expect(requestHasCapability({ params: [{}] } as any, 'test')).toBe(false);
    });

    it('returns false when capabilities is not an object', () => {
      expect(
        requestHasCapability({ params: [{ capabilities: 'not-an-object' }] } as any, 'test')
      ).toBe(false);
    });

    it('returns true when capability exists', () => {
      expect(
        requestHasCapability(
          { params: [{ capabilities: { testCapability: true } }] } as any,
          'testCapability'
        )
      ).toBe(true);
    });

    it('returns false when capability does not exist', () => {
      expect(
        requestHasCapability(
          { params: [{ capabilities: { otherCapability: true } }] } as any,
          'testCapability'
        )
      ).toBe(false);
    });
  });
});

describe('prependWithoutDuplicates', () => {
  it('should prepend an item to an array without duplicates', () => {
    expect(prependWithoutDuplicates(['1', '2', '3'], '4')).toEqual(['4', '1', '2', '3']);
  });

  it('should not prepend an item to an array if it is already present', () => {
    expect(prependWithoutDuplicates(['1', '2', '3'], '2')).toEqual(['2', '1', '3']);
  });
});

describe('getCachedWalletConnectResponse', () => {
  beforeEach(() => {
    vi.spyOn(store.spendPermissions, 'get').mockReturnValue([]);
    vi.spyOn(store.subAccounts, 'get').mockReturnValue(undefined);
    vi.spyOn(store.account, 'get').mockReturnValue({ accounts: undefined });
  });

  it('should return null if no accounts exist', async () => {
    const result = await getCachedWalletConnectResponse();
    expect(result).toBeNull();
  });

  it('should return accounts with no capabilities if no spend permissions or sub accounts', async () => {
    vi.spyOn(store.account, 'get').mockReturnValue({ accounts: ['0x123', '0x456'] });

    const result = await getCachedWalletConnectResponse();
    expect(result).toEqual({
      accounts: [
        {
          address: '0x123',
          capabilities: {
            subAccounts: undefined,
            spendPermissions: undefined,
          },
        },
        {
          address: '0x456',
          capabilities: {
            subAccounts: undefined,
            spendPermissions: undefined,
          },
        },
      ],
    });
  });

  it('should include sub account capability if sub account exists', async () => {
    vi.spyOn(store.account, 'get').mockReturnValue({ accounts: ['0x123'] });
    vi.spyOn(store.subAccounts, 'get').mockReturnValue({
      address: '0xsub',
      factory: '0xfactory',
      factoryData: '0xdata',
    });

    const result = await getCachedWalletConnectResponse();
    expect(result).toEqual({
      accounts: [
        {
          address: '0x123',
          capabilities: {
            subAccounts: [
              {
                address: '0xsub',
                factory: '0xfactory',
                factoryData: '0xdata',
              },
            ],
            spendPermissions: undefined,
          },
        },
      ],
    });
  });

  it('should include spend permissions capability if spend permissions exist', async () => {
    vi.spyOn(store.account, 'get').mockReturnValue({ accounts: ['0x123'] });
    vi.spyOn(store.spendPermissions, 'get').mockReturnValue([
      {
        signature: '0xsig1',
        chainId: 1,
        permission: {
          account: '0x123',
          spender: '0xspender1',
          token: '0xtoken1',
          allowance: '1000000',
          period: 86400,
          start: 1234567890,
          end: 1234567890 + 86400,
          salt: '0xsalt1',
          extraData: '0x',
        },
      },
      {
        signature: '0xsig2',
        chainId: 1,
        permission: {
          account: '0x123',
          spender: '0xspender2',
          token: '0xtoken2',
          allowance: '2000000',
          period: 86400,
          start: 1234567890,
          end: 1234567890 + 86400,
          salt: '0xsalt2',
          extraData: '0x',
        },
      },
    ]);

    const result = await getCachedWalletConnectResponse();
    expect(result).toEqual({
      accounts: [
        {
          address: '0x123',
          capabilities: {
            subAccounts: undefined,
            spendPermissions: {
              permissions: [
                {
                  signature: '0xsig1',
                  chainId: 1,
                  permission: {
                    account: '0x123',
                    spender: '0xspender1',
                    token: '0xtoken1',
                    allowance: '1000000',
                    period: 86400,
                    start: 1234567890,
                    end: 1234567890 + 86400,
                    salt: '0xsalt1',
                    extraData: '0x',
                  },
                },
                {
                  signature: '0xsig2',
                  chainId: 1,
                  permission: {
                    account: '0x123',
                    spender: '0xspender2',
                    token: '0xtoken2',
                    allowance: '2000000',
                    period: 86400,
                    start: 1234567890,
                    end: 1234567890 + 86400,
                    salt: '0xsalt2',
                    extraData: '0x',
                  },
                },
              ],
            },
          },
        },
      ],
    });
  });

  it('should include both sub account and spend permissions capabilities if both exist', async () => {
    vi.spyOn(store.account, 'get').mockReturnValue({ accounts: ['0x123'] });
    vi.spyOn(store.subAccounts, 'get').mockReturnValue({
      address: '0xsub',
      factory: '0xfactory',
      factoryData: '0xdata',
    });
    vi.spyOn(store.spendPermissions, 'get').mockReturnValue([
      {
        signature: '0xsig1',
        chainId: 1,
        permission: {
          account: '0x123',
          spender: '0xspender1',
          token: '0xtoken1',
          allowance: '1000000',
          period: 86400,
          start: 1234567890,
          end: 1234567890 + 86400,
          salt: '0xsalt1',
          extraData: '0x',
        },
      },
    ]);

    const result = await getCachedWalletConnectResponse();
    expect(result).toEqual({
      accounts: [
        {
          address: '0x123',
          capabilities: {
            subAccounts: [
              {
                address: '0xsub',
                factory: '0xfactory',
                factoryData: '0xdata',
              },
            ],
            spendPermissions: {
              permissions: [
                {
                  signature: '0xsig1',
                  chainId: 1,
                  permission: {
                    account: '0x123',
                    spender: '0xspender1',
                    token: '0xtoken1',
                    allowance: '1000000',
                    period: 86400,
                    start: 1234567890,
                    end: 1234567890 + 86400,
                    salt: '0xsalt1',
                    extraData: '0x',
                  },
                },
              ],
            },
          },
        },
      ],
    });
  });
});
