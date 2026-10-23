import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { sessionFromAccounts } from ':core/namespaces/eip155/session.fixtures.js';
import { sessionFromSolanaAccounts } from ':core/namespaces/solana/session.js';
import { RequestArguments } from ':core/provider/interface.js';
import type { WalletTransport } from ':core/transport/index.js';
import { store } from ':store/store.js';
import * as providerUtil from ':util/provider.js';
import { CoinbaseWalletProvider } from './CoinbaseWalletProvider.js';

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
  return new CoinbaseWalletProvider({ transport: mockTransport(), store });
}

let provider: CoinbaseWalletProvider;

beforeEach(() => {
  vi.resetAllMocks();
  mockHandshake.mockResolvedValue(undefined);
  mockSend.mockImplementation(async (request: RequestArguments) => {
    if (request.method === 'wallet_createSession') {
      const params = request.params as {
        scopes: Record<
          string,
          {
            methods: string[];
            notifications: string[];
          }
        >;
      };
      return {
        scopes: Object.fromEntries(
          Object.entries(params.scopes).map(([scopeKey, scope]) => [
            scopeKey,
            {
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
      chainId: params.chainId,
      result: { method: params.request.method, result },
    };
  });
  mockCleanup.mockResolvedValue(undefined);

  vi.spyOn(providerUtil, 'fetchRPCRequest').mockImplementation(mockFetchRPCRequest);

  store.session.clear();
  store.setState({ activeChainId: undefined });

  provider = createProvider();
});

describe('Provider identity', () => {
  it('identifies as Coinbase Wallet', () => {
    expect(provider.isCoinbaseWallet).toBe(true);
  });
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

  it('reports a user initiated disconnection exactly once', async () => {
    // `cleanup` clears the shared session, which fires the subscription that also reports
    // disconnects. The path that caused the transition owns the event; the echo is silent.
    store.session.set(sessionFromAccounts({ accounts: [ACCOUNT], chainId: 1 }));
    mockCleanup.mockImplementation(async () => {
      store.session.clear();
    });
    const disconnectListener = vi.fn();
    provider.on('disconnect', disconnectListener);

    await provider.disconnect();

    expect(disconnectListener).toHaveBeenCalledTimes(1);
    expect(disconnectListener).toHaveBeenCalledWith(
      standardErrors.provider.disconnected('User initiated disconnection')
    );
  });

  it('emits disconnected state when another interface clears the shared session', () => {
    const accountsChangedListener = vi.fn();
    const disconnectListener = vi.fn();
    provider.on('accountsChanged', accountsChangedListener);
    provider.on('disconnect', disconnectListener);
    store.session.set(sessionFromAccounts({ accounts: [ACCOUNT], chainId: 1 }));

    store.session.clear();

    expect(accountsChangedListener).toHaveBeenCalledWith([]);
    expect(disconnectListener).toHaveBeenCalledWith(
      standardErrors.provider.disconnected('Shared wallet session disconnected')
    );
  });

  it('reports a wallet 4100 once, through the session core cleared', async () => {
    store.session.set(sessionFromAccounts({ accounts: [ACCOUNT], chainId: 1 }));
    mockSend.mockRejectedValueOnce(standardErrors.provider.unauthorized('stale session'));
    mockCleanup.mockImplementation(async () => {
      store.session.clear();
    });
    const accountsChangedListener = vi.fn();
    const disconnectListener = vi.fn();
    provider.on('accountsChanged', accountsChangedListener);
    provider.on('disconnect', disconnectListener);

    await expect(
      provider.request({ method: 'personal_sign', params: ['0x68656c6c6f', ACCOUNT] })
    ).rejects.toMatchObject({ code: standardErrorCodes.provider.unauthorized });

    expect(mockCleanup).toHaveBeenCalledOnce();
    expect(accountsChangedListener).toHaveBeenCalledWith([]);
    expect(disconnectListener).toHaveBeenCalledTimes(1);
    expect(disconnectListener).toHaveBeenCalledWith(
      standardErrors.provider.disconnected('Shared wallet session disconnected')
    );
  });

  it('keeps a Solana-only session when an EVM request has not connected yet', async () => {
    const solanaSession = sessionFromSolanaAccounts({
      accounts: ['So11111111111111111111111111111111111111112'],
    });
    store.session.set(solanaSession);
    const disconnectListener = vi.fn();
    provider.on('disconnect', disconnectListener);

    await expect(
      provider.request({ method: 'personal_sign', params: ['0x68656c6c6f', ACCOUNT] })
    ).rejects.toMatchObject({ code: standardErrorCodes.provider.unauthorized });

    expect(mockCleanup).not.toHaveBeenCalled();
    expect(store.session.get()).toEqual(solanaSession);
    expect(disconnectListener).not.toHaveBeenCalled();
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

  it('starts a restored provider on mainnet, silently, even if the catalog omits it', async () => {
    // The wallet always serves Ethereum mainnet, so the SDK never relocates a provider
    // onto a chain the restored catalog happens to list. Construction is not a chain move
    // and must not announce one.
    store.session.set(sessionFromAccounts({ accounts: [ACCOUNT], chains: [8453, 10] }));
    const emitSpy = vi.spyOn(CoinbaseWalletProvider.prototype, 'emit');

    const restoredProvider = createProvider();

    expect(emitSpy).not.toHaveBeenCalledWith('chainChanged', expect.anything());
    emitSpy.mockRestore();
    await expect(restoredProvider.request({ method: 'eth_chainId' })).resolves.toBe('0x1');
  });

  it('starts on the chain the last provider saved, silently', async () => {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x2105' }],
    });
    expect(store.activeChain.get()).toBe(8453);
    const emitSpy = vi.spyOn(CoinbaseWalletProvider.prototype, 'emit');

    const reloadedProvider = createProvider();

    expect(emitSpy).not.toHaveBeenCalledWith('chainChanged', expect.anything());
    emitSpy.mockRestore();
    await expect(reloadedProvider.request({ method: 'eth_chainId' })).resolves.toBe('0x2105');
  });

  it('does not move the active chain when the shared session changes', async () => {
    const chainChangedListener = vi.fn();
    provider.on('chainChanged', chainChangedListener);
    store.session.set(sessionFromAccounts({ accounts: [ACCOUNT], chainId: 1 }));

    store.session.set(sessionFromAccounts({ accounts: [ACCOUNT], chainId: 8453 }));

    // Only `wallet_switchEthereumChain`, or the wallet approving a requested chain, moves
    // the provider. A catalog change is capability news, not a relocation.
    expect(chainChangedListener).not.toHaveBeenCalled();
    await expect(provider.request({ method: 'eth_chainId' })).resolves.toBe('0x1');
  });
});

describe('Telemetry', () => {
  const logEvent = vi.fn();

  beforeEach(() => {
    window.ClientAnalytics = { logEvent } as unknown as typeof window.ClientAnalytics;
  });

  afterEach(() => {
    window.ClientAnalytics = undefined;
  });

  function logged(name: string) {
    return logEvent.mock.calls.filter(([eventName]) => eventName === name).map(([, data]) => data);
  }

  it('sends the wallet the correlation id it logs for the dapp request', async () => {
    store.session.set(sessionFromAccounts({ accounts: [ACCOUNT], chainId: 1 }));
    const sign = { method: 'personal_sign', params: ['0x68656c6c6f', ACCOUNT] };

    await provider.request(sign);

    const [started] = logged('provider.request.started');
    expect(started).toMatchObject({ surface: 'eip1193_provider', method: 'personal_sign' });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'wallet_invokeMethod' }),
      started.correlationId
    );
  });

  it('reports a disconnect only when it cleared a saved session', async () => {
    await provider.disconnect();
    expect(logged('session.cleared')).toEqual([]);

    store.session.set(sessionFromAccounts({ accounts: [ACCOUNT], chainId: 1 }));
    await provider.disconnect();
    expect(logged('session.cleared')).toEqual([
      expect.objectContaining({ clearReason: 'user_disconnect' }),
    ]);
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
      expect(mockHandshake).toHaveBeenCalledWith({ method: 'handshake' }, expect.any(String));
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        {
          method: 'wallet_invokeMethod',
          params: {
            chainId: 'eip155:1',
            request: args,
          },
        },
        expect.any(String)
      );
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    }
  );

  it('pins the envelope chain through a local switch, with no wallet round trip', async () => {
    await expect(
      provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }],
      })
    ).resolves.toBeUndefined();
    expect(mockHandshake).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();

    const args = { method: 'wallet_sendCalls', params: ['0xdeadbeef'] };
    await expect(provider.request(args)).resolves.toBe('0xok');

    expect(mockSend).toHaveBeenCalledWith(
      {
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:8453',
          request: args,
        },
      },
      expect.any(String)
    );
  });
});

describe('ensureSession / createSession', () => {
  it('pairs on eth_requestAccounts and returns eip155 accounts', async () => {
    const accounts = await provider.request({ method: 'eth_requestAccounts' });

    expect(mockHandshake).toHaveBeenCalledWith({ method: 'handshake' }, expect.any(String));
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.objectContaining({
          scopes: {
            eip155: expect.objectContaining({
              version: '1',
            }),
          },
        }),
      }),
      expect.any(String)
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

    expect(mockHandshake).toHaveBeenCalledWith({ method: 'handshake' }, expect.any(String));
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.objectContaining({
          scopes: {
            eip155: expect.objectContaining({
              capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x1' } },
              version: '1',
            }),
          },
        }),
      }),
      expect.any(String)
    );
    // The mock wallet answers only namespace-wide capabilities, which are not connect answers.
    expect(result).toEqual({ accounts: [{ address: ACCOUNT }] });
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
          scopes: {
            eip155: expect.objectContaining({
              capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x1' } },
              version: '1',
            }),
          },
        }),
      }),
      expect.any(String)
    );
  });
});
