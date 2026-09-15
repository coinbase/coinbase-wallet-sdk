import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { sessionFromAccounts } from ':core/namespaces/eip155/index.js';
import type { WalletTransport } from ':core/transport/index.js';
import { store } from ':store/store.js';
import * as providerUtil from ':util/provider.js';
import { BaseAccountProvider } from './BaseAccountProvider.js';

const ACCOUNT = '0x0000000000000000000000000000000000000001';
const SUB_ACCOUNT = '0x0000000000000000000000000000000000000002';

const mockHandshake = vi.fn();
const mockSend = vi.fn();
const mockCleanup = vi.fn();
const mockFetchRPCRequest = vi.fn();

function mockTransport(): WalletTransport {
  return {
    handshake: mockHandshake,
    request: mockSend,
    readSession: () => store.session.get(),
    writeSession: (session) => store.session.set(session),
    cleanup: mockCleanup,
  };
}

function createProvider() {
  return new BaseAccountProvider(
    {
      metadata: { appName: 'Test App', appLogoUrl: null, appChainIds: [1] },
      preference: { telemetry: false },
    },
    mockTransport(),
    store
  );
}

let provider: BaseAccountProvider;

beforeEach(() => {
  vi.resetAllMocks();
  mockHandshake.mockResolvedValue(undefined);
  mockSend.mockImplementation(async (request: RequestArguments) => {
    if (request.method === 'wallet_createSession') {
      const params = request.params as {
        scopes: Record<
          string,
          {
            chains?: string[];
            methods: string[];
            notifications: string[];
          }
        >;
      };
      return {
        sessionId: 'session-1',
        scopes: Object.fromEntries(
          Object.entries(params.scopes).map(([scopeKey, scope]) => [
            scopeKey,
            {
              ...(scope.chains ? { chains: scope.chains } : {}),
              accounts: [ACCOUNT],
              methods: scope.methods,
              notifications: scope.notifications,
              capabilities: {},
            },
          ])
        ),
      };
    }
    const params = request.params as {
      sessionId?: string;
      chainId: `eip155:${string}`;
      request: RequestArguments;
    };
    const result =
      params.request.method === 'wallet_connect'
        ? { accounts: [{ address: ACCOUNT, capabilities: {} }] }
        : params.request.method === 'wallet_addSubAccount'
          ? { address: SUB_ACCOUNT }
          : '0xok';
    return {
      sessionId: params.sessionId,
      chainId: params.chainId,
      result: { method: params.request.method, result },
    };
  });
  mockCleanup.mockResolvedValue(undefined);

  vi.spyOn(providerUtil, 'fetchRPCRequest').mockImplementation(mockFetchRPCRequest);

  store.session.clear();
  store.eip155.subAccounts.clear();
  store.eip155.subAccountsConfig.clear();
  store.eip155.spendPermissions.clear();

  provider = createProvider();
});

describe('Event handling', () => {
  it('emits disconnect event on user initiated disconnection', async () => {
    const disconnectListener = vi.fn();
    provider.on('disconnect', disconnectListener);

    await provider.disconnect();

    expect(mockCleanup).toHaveBeenCalled();
    expect(disconnectListener).toHaveBeenCalledWith(
      standardErrors.provider.disconnected('User initiated disconnection')
    );
  });

  it('emits disconnected state when another interface clears the shared session', () => {
    const accountsChangedListener = vi.fn();
    const disconnectListener = vi.fn();
    provider.on('accountsChanged', accountsChangedListener);
    provider.on('disconnect', disconnectListener);
    store.session.set({
      ...sessionFromAccounts({ accounts: [ACCOUNT], chainId: 1 }),
      sessionId: 'shared-session',
    });

    store.session.clear();

    expect(accountsChangedListener).toHaveBeenCalledWith([]);
    expect(disconnectListener).toHaveBeenCalledWith(
      standardErrors.provider.disconnected('Shared wallet session disconnected')
    );
  });

  it('emits chainChanged', () => {
    const chainChangedListener = vi.fn();
    provider.on('chainChanged', chainChangedListener);
    provider.emit('chainChanged', '0x1');
    expect(chainChangedListener).toHaveBeenCalledWith('0x1');
  });

  it('emits accountsChanged', () => {
    const accountsChangedListener = vi.fn();
    provider.on('accountsChanged', accountsChangedListener);
    provider.emit('accountsChanged', ['0x123']);
    expect(accountsChangedListener).toHaveBeenCalledWith(['0x123']);
  });

  it('restores the first authorized chain when the metadata chain is not granted', async () => {
    store.session.set(sessionFromAccounts({ accounts: [ACCOUNT], chainId: 8453 }));
    const restoredProvider = createProvider();

    await expect(restoredProvider.request({ method: 'eth_chainId' })).resolves.toBe('0x2105');
  });

  it('falls back when a session update removes the active chain', async () => {
    const chainChangedListener = vi.fn();
    provider.on('chainChanged', chainChangedListener);
    store.session.set(sessionFromAccounts({ accounts: [ACCOUNT], chainId: 1 }));

    store.session.set(sessionFromAccounts({ accounts: [ACCOUNT], chainId: 8453 }));

    expect(chainChangedListener).toHaveBeenCalledOnce();
    expect(chainChangedListener).toHaveBeenCalledWith('0x2105');
    await expect(provider.request({ method: 'eth_chainId' })).resolves.toBe('0x2105');
  });
});

describe('Request Handling', () => {
  it('returns default chain id before pairing', async () => {
    await expect(provider.request({ method: 'eth_chainId' })).resolves.toBe('0x1');
    await expect(provider.request({ method: 'net_version' })).resolves.toBe(1);
  });

  it('throws error when handling invalid request', async () => {
    await expect(provider.request({} as RequestArguments)).rejects.toMatchObject({
      code: standardErrorCodes.rpc.invalidParams,
      message: "'args.method' must be a non-empty string.",
    });
  });

  it('throws error for requests with unsupported or deprecated method', async () => {
    const deprecated = ['eth_sign', 'eth_signTypedData_v2'];
    const unsupported = ['eth_subscribe', 'eth_unsubscribe'];

    for (const method of [...deprecated, ...unsupported]) {
      await expect(provider.request({ method })).rejects.toMatchObject({
        code: standardErrorCodes.provider.unsupportedMethod,
      });
    }
  });
});

describe('Ephemeral methods', () => {
  it('should post requests to wallet rpc url for wallet_getCallsStatus', async () => {
    const args = { method: 'wallet_getCallsStatus' };
    await provider.request(args);
    expect(mockFetchRPCRequest).toHaveBeenCalledWith(args, CB_WALLET_RPC_URL);
  });

  it.each(['wallet_sendCalls', 'wallet_sign', 'experimental_requestInfo'])(
    'invokes disconnected %s once without CAIP-25',
    async (method) => {
      const args = { method, params: ['0xdeadbeef'] };
      await expect(provider.request(args)).resolves.toBe('0xok');
      expect(mockHandshake).toHaveBeenCalledWith({ method: 'handshake' });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith({
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:1',
          request: args,
        },
      });
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    }
  );
});

describe('ensureSession / createSession', () => {
  it('pairs on eth_requestAccounts and returns eip155 accounts', async () => {
    const accounts = await provider.request({ method: 'eth_requestAccounts' });

    expect(mockHandshake).toHaveBeenCalledWith({ method: 'handshake' });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.objectContaining({
          scopes: {
            eip155: expect.objectContaining({
              chains: ['1'],
              params: [{ version: '1' }],
            }),
          },
        }),
      })
    );
    expect(accounts).toEqual([ACCOUNT]);
  });

  it('pairs on wallet_connect and forwards capabilities', async () => {
    const result = await provider.request({
      method: 'wallet_connect',
      params: [
        {
          version: '1',
          capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x1' } },
        },
      ],
    });

    expect(mockHandshake).toHaveBeenCalledWith({ method: 'handshake' });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.objectContaining({
          scopes: {
            eip155: expect.objectContaining({
              chains: ['1'],
              capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x1' } },
              params: [{ version: '1' }],
            }),
          },
        }),
      })
    );
    expect(result).toEqual({
      accounts: [{ address: ACCOUNT, capabilities: {} }],
    });
  });

  it('forwards wallet_connect capabilities after pairing', async () => {
    await provider.request({ method: 'eth_requestAccounts' });
    mockSend.mockClear();

    await provider.request({
      method: 'wallet_connect',
      params: [
        {
          version: '1',
          capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x1' } },
        },
      ],
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.objectContaining({
          sessionId: 'session-1',
          scopes: {
            eip155: expect.objectContaining({
              capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x1' } },
              params: [{ version: '1' }],
            }),
          },
        }),
      })
    );
  });
});

describe('sub-account', () => {
  const SUB = SUB_ACCOUNT;

  it('pairs before wallet_addSubAccount when disconnected', async () => {
    await expect(
      provider.request({
        method: 'wallet_addSubAccount',
        params: [{ version: '1', account: { type: 'deployed', address: SUB } }],
      })
    ).resolves.toMatchObject({ address: SUB });
    expect(mockSend).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ method: 'wallet_createSession' })
    );
    expect(mockSend).toHaveBeenLastCalledWith(
      expect.objectContaining({
        method: 'wallet_invokeMethod',
        params: expect.objectContaining({
          request: expect.objectContaining({ method: 'wallet_addSubAccount' }),
        }),
      })
    );
  });

  it('adds a sub-account through the popup after pairing', async () => {
    await provider.request({ method: 'eth_requestAccounts' });
    mockSend.mockClear();

    const result = await provider.request({
      method: 'wallet_addSubAccount',
      params: [{ version: '1', account: { type: 'deployed', address: SUB } }],
    });

    expect(result).toMatchObject({ address: SUB });
    expect(store.eip155.subAccounts.get()?.address).toBe(SUB);
    await expect(provider.request({ method: 'eth_accounts' })).resolves.toEqual([ACCOUNT, SUB]);
  });

  it('returns the cached sub-account from wallet_getSubAccounts', async () => {
    await provider.request({ method: 'eth_requestAccounts' });
    await provider.request({
      method: 'wallet_addSubAccount',
      params: [{ version: '1', account: { type: 'deployed', address: SUB } }],
    });
    mockFetchRPCRequest.mockClear();

    await expect(provider.request({ method: 'wallet_getSubAccounts' })).resolves.toEqual({
      subAccounts: [expect.objectContaining({ address: SUB })],
    });
    expect(mockFetchRPCRequest).not.toHaveBeenCalled();
  });
});

describe('ephemeral: true', () => {
  const params = {
    metadata: { appName: 'Test App', appLogoUrl: null, appChainIds: [1] },
    preference: { telemetry: false },
    ephemeral: true as const,
  };

  function createEphemeralProvider() {
    return new BaseAccountProvider(params, mockTransport(), store);
  }

  it.each(['wallet_sendCalls', 'wallet_sign', 'experimental_requestInfo'])(
    'invokes isolated %s once and cleans up',
    async (method) => {
      const ephemeral = createEphemeralProvider();
      const args = { method, params: ['0xdeadbeef'] };
      await expect(ephemeral.request(args)).resolves.toBe('0xok');
      expect(mockHandshake).toHaveBeenCalledWith({ method: 'handshake' });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith({
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:1',
          request: args,
        },
      });
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    }
  );

  it('forwards wallet_getCallsStatus to wallet rpc url', async () => {
    const ephemeral = createEphemeralProvider();
    const args = { method: 'wallet_getCallsStatus' };
    await ephemeral.request(args);
    expect(mockFetchRPCRequest).toHaveBeenCalledWith(args, CB_WALLET_RPC_URL);
  });

  it('rejects pairing so pay() cannot write a Session', async () => {
    const ephemeral = createEphemeralProvider();
    const disconnectSpy = vi.spyOn(ephemeral, 'disconnect');

    await expect(ephemeral.request({ method: 'eth_requestAccounts' })).rejects.toMatchObject({
      code: standardErrorCodes.provider.unauthorized,
    });

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(mockHandshake).not.toHaveBeenCalled();
  });
});
