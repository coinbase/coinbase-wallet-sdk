import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { EIP155_METHODS } from ':core/namespaces/eip155/methods.js';
import { SOLANA_METHODS } from ':core/namespaces/solana/index.js';
import type { ProviderInterface, RequestArguments } from ':core/provider/interface.js';
import type { Session } from ':core/session/types.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import { SolanaSignMessage } from '@solana/wallet-standard-features';
import { StandardConnect, type StandardConnectOutput } from '@wallet-standard/features';
import * as injectedProviderModule from '../eip1193/getInjectedProvider.js';
import * as hostModule from '../isCoinbaseWalletHost.js';
import { createSolanaWallet } from '../wallet-standard/createSolanaWallet.js';
import type { SolanaWallet } from '../wallet-standard/features.js';
import * as registeredSolanaModule from '../wallet-standard/getRegisteredSolanaWallet.js';
import { connectWallet } from './connect.js';

vi.mock('../eip1193/getInjectedProvider.js', () => ({ getInjectedProvider: vi.fn() }));
vi.mock('../isCoinbaseWalletHost.js', () => ({ isCoinbaseWalletHost: vi.fn() }));
vi.mock('../wallet-standard/getRegisteredSolanaWallet.js', () => ({
  getRegisteredSolanaWallet: vi.fn(),
}));

const getInjectedProvider = vi.mocked(injectedProviderModule.getInjectedProvider);
const isCoinbaseWalletHost = vi.mocked(hostModule.isCoinbaseWalletHost);
const getRegisteredSolanaWallet = vi.mocked(registeredSolanaModule.getRegisteredSolanaWallet);

const EVM_ACCOUNT = '0x0000000000000000000000000000000000000001';
const SOLANA_ACCOUNT = 'So11111111111111111111111111111111111111112';

function setup({
  restored,
  result,
  grantedEvmCapabilities,
}: {
  restored?: Session;
  result?: (request: RequestArguments) => unknown;
  grantedEvmCapabilities?: Record<string, unknown>;
} = {}) {
  let session = restored;
  const listeners = new Set<(session: Session | undefined) => void>();
  const sessionStore: Store['session'] = {
    get: () => session,
    set: (next) => {
      session = next;
      for (const listener of listeners) listener(next);
    },
    clear: () => {
      session = undefined;
      for (const listener of listeners) listener(undefined);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  const request = vi.fn(async (args: RequestArguments) => {
    if (result) return result(args);
    const params = args.params as {
      sessionId?: string;
      scopes: Record<
        string,
        {
          chains?: string[];
          methods: string[];
          notifications: string[];
          capabilities?: Record<string, unknown>;
          version?: string;
        }
      >;
    };
    return {
      sessionId: params.sessionId ?? 'session-1',
      scopes: Object.fromEntries(
        Object.entries(params.scopes).map(([namespace, scope]) => {
          const { version: _version, ...grantedScope } = scope;
          return [
            namespace,
            {
              ...grantedScope,
              accounts: [namespace === 'solana' ? SOLANA_ACCOUNT : EVM_ACCOUNT],
              ...(namespace === 'eip155'
                ? {
                    capabilities: grantedEvmCapabilities ?? {
                      aos: { signature: '0xevm-signature', isSCW: true },
                    },
                  }
                : {}),
            },
          ];
        })
      ),
    };
  });
  const transport: WalletTransport = {
    handshake: vi.fn().mockResolvedValue(undefined),
    request,
    readSession: sessionStore.get,
    writeSession: vi.fn(sessionStore.set),
    cleanup: vi.fn(async () => sessionStore.clear()),
  };

  // The SDK's popup wallet, registered the way `sdk.solana.registerWallet` registers it.
  let wallet: SolanaWallet | null = null;
  const solanaWallet = () => {
    wallet ??= createSolanaWallet(transport, sessionStore);
    return wallet;
  };
  getRegisteredSolanaWallet.mockImplementation(solanaWallet);
  return { transport, request, solanaWallet };
}

function addresses(output: StandardConnectOutput | undefined) {
  return output?.accounts.map(({ address }) => address);
}

function injectedProvider(request: ProviderInterface['request']): ProviderInterface {
  return {
    request,
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
  } as unknown as ProviderInterface;
}

function registeredSolanaWallet(connect: () => Promise<StandardConnectOutput>) {
  return {
    name: 'Coinbase Wallet',
    features: { [StandardConnect]: { version: '1.0.0', connect } },
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  getInjectedProvider.mockReturnValue(null);
  isCoinbaseWalletHost.mockReturnValue(false);
  getRegisteredSolanaWallet.mockReturnValue(null);
});

describe('connectWallet through the popup', () => {
  it('requests EVM and Solana accounts in one CAIP-25 session', async () => {
    const { transport, request } = setup();

    const result = await connectWallet({
      options: { evm: { capabilities: { aos: { nonce: 'evm-nonce' } } }, solana: true },
      transport,
    });

    expect(result.evm).toEqual({
      accounts: [
        {
          address: EVM_ACCOUNT,
          capabilities: { aos: { signature: '0xevm-signature', isSCW: true } },
        },
      ],
    });
    expect(addresses(result.solana)).toEqual([SOLANA_ACCOUNT]);
    expect(transport.handshake).toHaveBeenCalledWith({ method: 'handshake' });
    expect(request).toHaveBeenCalledWith({
      method: 'wallet_createSession',
      params: {
        scopes: {
          eip155: {
            methods: EIP155_METHODS,
            notifications: ['accountsChanged', 'chainChanged'],
            capabilities: { aos: { nonce: 'evm-nonce' } },
            version: '1',
          },
          solana: {
            methods: SOLANA_METHODS,
            notifications: [],
          },
        },
      },
    });
  });

  it("returns the registered Solana wallet's own Wallet Standard accounts", async () => {
    const { transport, solanaWallet } = setup();

    const result = await connectWallet({ options: { solana: true }, transport });

    expect(result.solana?.accounts).toBe(solanaWallet().accounts);
    expect(result.solana?.accounts[0]?.publicKey).toHaveLength(32);
    expect(result.solana?.accounts[0]?.features).toContain(SolanaSignMessage);
  });

  it('returns no Solana accounts when the dapp has not registered the Solana wallet', async () => {
    const { transport } = setup();
    getRegisteredSolanaWallet.mockReturnValue(null);

    const result = await connectWallet({ options: { evm: true, solana: true }, transport });

    expect(result.evm).toEqual({ accounts: [{ address: EVM_ACCOUNT }] });
    expect(result.solana).toEqual({ accounts: [] });
  });

  it('selects a basic EVM connection with true and returns no capabilities', async () => {
    const { transport, request } = setup();

    await expect(connectWallet({ options: { evm: true }, transport })).resolves.toEqual({
      evm: { accounts: [{ address: EVM_ACCOUNT }] },
    });

    expect(request).toHaveBeenCalledWith({
      method: 'wallet_createSession',
      params: {
        scopes: {
          eip155: {
            methods: EIP155_METHODS,
            notifications: ['accountsChanged', 'chainChanged'],
            version: '1',
          },
        },
      },
    });
  });

  it('selects a basic Solana connection with true without requiring EVM chains', async () => {
    const { transport, request } = setup();

    const result = await connectWallet({ options: { solana: true }, transport });

    expect(result.evm).toBeUndefined();
    expect(addresses(result.solana)).toEqual([SOLANA_ACCOUNT]);
    expect(request).toHaveBeenCalledWith({
      method: 'wallet_createSession',
      params: {
        scopes: {
          solana: {
            methods: SOLANA_METHODS,
            notifications: [],
          },
        },
      },
    });
  });

  it('connects both namespaces when options are omitted', async () => {
    const { transport, request } = setup();

    const result = await connectWallet({ transport });

    expect(result.evm).toEqual({ accounts: [{ address: EVM_ACCOUNT }] });
    expect(addresses(result.solana)).toEqual([SOLANA_ACCOUNT]);
    const createSessionRequest = request.mock.calls[0]?.[0];
    expect(Object.keys((createSessionRequest?.params as { scopes: object }).scopes)).toEqual([
      'eip155',
      'solana',
    ]);
  });

  it('reuses an existing session without returning its stored capabilities', async () => {
    const restored: Session = {
      sessionId: 'session-1',
      namespaces: {
        eip155: {
          accounts: [EVM_ACCOUNT],
          methods: [...EIP155_METHODS],
          capabilities: { aos: { signature: '0xstale-signature' } },
        },
        solana: {
          accounts: [SOLANA_ACCOUNT],
          methods: [...SOLANA_METHODS],
        },
      },
    };
    const { transport, request } = setup({ restored });

    const result = await connectWallet({
      options: { evm: true, solana: true },
      transport,
    });

    expect(result.evm).toEqual({ accounts: [{ address: EVM_ACCOUNT }] });
    expect(addresses(result.solana)).toEqual([SOLANA_ACCOUNT]);
    expect(transport.handshake).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('reuses a session the wallet granted without optional methods', async () => {
    const notOptional = (method: string) => method !== 'coinbase_signPreparedCalls';
    const restored: Session = {
      sessionId: 'session-1',
      namespaces: {
        eip155: { accounts: [EVM_ACCOUNT], methods: EIP155_METHODS.filter(notOptional) },
        solana: { accounts: [SOLANA_ACCOUNT], methods: SOLANA_METHODS.filter(notOptional) },
      },
    };
    const { transport, request } = setup({ restored });

    const result = await connectWallet({
      options: { evm: true, solana: true },
      transport,
    });

    expect(result.evm).toEqual({ accounts: [{ address: EVM_ACCOUNT }] });
    expect(addresses(result.solana)).toEqual([SOLANA_ACCOUNT]);
    expect(transport.handshake).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('requests fresh capability results even when an account session exists', async () => {
    const restored: Session = {
      sessionId: 'session-1',
      namespaces: {
        eip155: {
          accounts: [EVM_ACCOUNT],
          methods: [...EIP155_METHODS],
        },
      },
    };
    const { transport, request } = setup({ restored });

    await connectWallet({
      options: { evm: { capabilities: { aos: { nonce: 'fresh' } } } },
      transport,
    });

    expect(transport.handshake).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ sessionId: 'session-1' }),
      })
    );
  });

  it('clears a stale stored session on 4100 without retrying', async () => {
    const restored: Session = {
      sessionId: 'stale-session',
      namespaces: { eip155: { accounts: [EVM_ACCOUNT], methods: [...EIP155_METHODS] } },
    };
    const { transport, request } = setup({
      restored,
      result: () => {
        throw standardErrors.provider.unauthorized(
          'wallet_createSession update session is not authorized'
        );
      },
    });

    await expect(
      connectWallet({ options: { evm: true, solana: true }, transport })
    ).rejects.toMatchObject({ code: standardErrorCodes.provider.unauthorized });
    expect(request).toHaveBeenCalledOnce();
    expect(transport.cleanup).toHaveBeenCalledOnce();
    expect(transport.readSession()).toBeUndefined();
  });

  it('keeps the stored session when the user rejects the popup', async () => {
    const restored: Session = {
      sessionId: 'session-1',
      namespaces: { eip155: { accounts: [EVM_ACCOUNT], methods: [...EIP155_METHODS] } },
    };
    const { transport } = setup({
      restored,
      result: () => {
        throw standardErrors.provider.userRejectedRequest();
      },
    });

    await expect(
      connectWallet({ options: { evm: true, solana: true }, transport })
    ).rejects.toMatchObject({ code: standardErrorCodes.provider.userRejectedRequest });
    expect(transport.cleanup).not.toHaveBeenCalled();
    expect(transport.readSession()).toEqual(restored);
  });

  it('returns independently projected namespaces for a partial grant', async () => {
    const { transport } = setup({
      result: (args) => {
        const params = args.params as {
          scopes: Record<
            string,
            {
              chains?: string[];
              methods: string[];
              notifications: string[];
              version?: string;
            }
          >;
        };
        const { version: _version, ...eip155Scope } = params.scopes.eip155;
        return {
          sessionId: 'partial-session',
          scopes: {
            eip155: {
              ...eip155Scope,
              accounts: [EVM_ACCOUNT],
            },
            solana: {
              accounts: [],
              methods: [],
              notifications: [],
            },
          },
        };
      },
    });

    const result = await connectWallet({
      options: { evm: true, solana: true },
      transport,
    });

    expect(result.evm).toEqual({ accounts: [{ address: EVM_ACCOUNT }] });
    expect(result.solana).toEqual({ accounts: [] });
    expect(transport.readSession()?.sessionId).toBe('partial-session');
  });

  it('projects fresh accounts when the wallet grants only some requested methods', async () => {
    const { transport } = setup({
      result: () => ({
        sessionId: 'method-partial-session',
        scopes: {
          eip155: {
            accounts: [EVM_ACCOUNT],
            methods: ['eth_sendTransaction'],
            notifications: [],
          },
          solana: {
            accounts: [SOLANA_ACCOUNT],
            methods: ['solana_signMessage'],
            notifications: [],
          },
        },
      }),
    });

    const result = await connectWallet({
      options: { evm: true, solana: true },
      transport,
    });

    expect(result.evm).toEqual({ accounts: [{ address: EVM_ACCOUNT }] });
    expect(addresses(result.solana)).toEqual([SOLANA_ACCOUNT]);
  });

  it('forwards every requested capability and returns the wallet answers unchanged', async () => {
    const unsupported = {
      code: standardErrorCodes.provider.unsupportedMethod,
      message: 'Unsupported capability',
    };
    const { transport, request } = setup({
      grantedEvmCapabilities: {
        aos: { signature: '0xevm-signature', isSCW: true },
        addSubAccount: unsupported,
      },
    });

    await expect(
      connectWallet({
        options: { evm: { capabilities: { aos: { nonce: 'nonce' }, addSubAccount: true } } },
        transport,
      })
    ).resolves.toEqual({
      evm: {
        accounts: [
          {
            address: EVM_ACCOUNT,
            capabilities: {
              aos: { signature: '0xevm-signature', isSCW: true },
              addSubAccount: unsupported,
            },
          },
        ],
      },
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          scopes: expect.objectContaining({
            eip155: expect.objectContaining({
              capabilities: { aos: { nonce: 'nonce' }, addSubAccount: true },
            }),
          }),
        }),
      })
    );
  });

  it("returns each EVM account's own capability answers", async () => {
    const OTHER = '0x0000000000000000000000000000000000000002';
    const { transport } = setup({
      result: () => ({
        sessionId: 'per-account-session',
        scopes: {
          eip155: {
            accounts: [EVM_ACCOUNT, OTHER],
            methods: [...EIP155_METHODS],
            notifications: [],
            capabilities: { paymasterService: { supported: true } },
            accountCapabilities: {
              [EVM_ACCOUNT]: { aos: { signature: '0xfirst' } },
              [OTHER]: { aos: { signature: '0xsecond' } },
            },
          },
        },
      }),
    });

    await expect(
      connectWallet({ options: { evm: { capabilities: { aos: { nonce: 'n' } } } }, transport })
    ).resolves.toEqual({
      evm: {
        accounts: [
          { address: EVM_ACCOUNT, capabilities: { aos: { signature: '0xfirst' } } },
          { address: OTHER, capabilities: { aos: { signature: '0xsecond' } } },
        ],
      },
    });
  });

  it('rejects a popup grant when every requested namespace is empty', async () => {
    const { transport } = setup({
      result: (args) => {
        const params = args.params as {
          scopes: Record<string, { chains?: string[]; version?: string }>;
        };
        return {
          sessionId: 'empty-session',
          scopes: Object.fromEntries(
            Object.entries(params.scopes).map(([namespace, scope]) => {
              const { version: _version, ...grantedScope } = scope;
              return [
                namespace,
                {
                  ...grantedScope,
                  accounts: [],
                  methods: [],
                  notifications: [],
                },
              ];
            })
          ),
        };
      },
    });

    await expect(
      connectWallet({ options: { evm: true, solana: true }, transport })
    ).rejects.toMatchObject({
      code: standardErrorCodes.provider.unauthorized,
      message: 'Wallet did not grant any requested namespace',
    });
    expect(transport.readSession()?.sessionId).toBe('empty-session');
  });

  it('rejects namespaces that are not implemented yet', async () => {
    const { transport } = setup();

    await expect(
      connectWallet({
        // @ts-expect-error bitcoin is not a supported chain
        options: { bitcoin: true },
        transport,
      })
    ).rejects.toMatchObject({
      code: standardErrorCodes.rpc.invalidParams,
      message: 'Unsupported wallet namespace: bitcoin',
    });
    expect(transport.handshake).not.toHaveBeenCalled();
  });

  it('rejects a request with no namespaces', async () => {
    const { transport } = setup();

    await expect(connectWallet({ options: {}, transport })).rejects.toMatchObject({
      code: standardErrorCodes.rpc.invalidParams,
      message: 'At least one wallet namespace must be requested',
    });
    expect(transport.handshake).not.toHaveBeenCalled();
  });
});

describe('connectWallet inside a Coinbase Wallet host', () => {
  beforeEach(() => {
    isCoinbaseWalletHost.mockReturnValue(true);
  });

  it('uses wallet_connect and Wallet Standard silent connect instead of the popup', async () => {
    const { transport } = setup();
    const request = vi.fn().mockResolvedValue({
      accounts: [
        {
          address: EVM_ACCOUNT,
          capabilities: { aos: { signature: '0xsignature', isSCW: true } },
        },
      ],
    });
    const solanaOutput = { accounts: [] } satisfies StandardConnectOutput;
    const connect = vi.fn().mockResolvedValue(solanaOutput);
    getInjectedProvider.mockReturnValue(injectedProvider(request));
    getRegisteredSolanaWallet.mockReturnValue(registeredSolanaWallet(connect));

    const result = await connectWallet({
      options: { evm: { capabilities: { aos: { nonce: 'evm-nonce' } } }, solana: true },
      transport,
    });

    expect(result.evm).toEqual({
      accounts: [
        {
          address: EVM_ACCOUNT,
          capabilities: { aos: { signature: '0xsignature', isSCW: true } },
        },
      ],
    });
    expect(result.solana).toBe(solanaOutput);
    expect(request).toHaveBeenCalledWith({
      method: 'wallet_connect',
      params: [{ version: '1', capabilities: { aos: { nonce: 'evm-nonce' } } }],
    });
    expect(connect).toHaveBeenCalledWith({ silent: true });
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('uses wallet_connect without capabilities for a basic EVM connection', async () => {
    const { transport } = setup();
    const request = vi.fn().mockResolvedValue({ accounts: [{ address: EVM_ACCOUNT }] });
    getInjectedProvider.mockReturnValue(injectedProvider(request));

    await expect(connectWallet({ options: { evm: true }, transport })).resolves.toEqual({
      evm: { accounts: [{ address: EVM_ACCOUNT }] },
    });
    expect(request).toHaveBeenCalledWith({
      method: 'wallet_connect',
      params: [{ version: '1' }],
    });
  });

  it('connects the registered Solana wallet when the host has no EVM provider', async () => {
    const { transport } = setup();
    const solanaOutput = { accounts: [] } satisfies StandardConnectOutput;
    const connect = vi.fn().mockResolvedValue(solanaOutput);
    getRegisteredSolanaWallet.mockReturnValue(registeredSolanaWallet(connect));

    await expect(connectWallet({ options: { solana: true }, transport })).resolves.toEqual({
      solana: solanaOutput,
    });
    expect(connect).toHaveBeenCalledWith({ silent: true });
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('propagates wallet_connect rejection without reading eth_accounts', async () => {
    const { transport } = setup();
    const rejection = { code: standardErrorCodes.provider.userRejectedRequest };
    const request = vi.fn().mockRejectedValue(rejection);
    getInjectedProvider.mockReturnValue(injectedProvider(request));

    await expect(connectWallet({ options: { evm: true }, transport })).rejects.toBe(rejection);
    expect(request).toHaveBeenCalledOnce();
  });

  it('returns requested namespaces with empty accounts when no authorization is available', async () => {
    const { transport } = setup();
    const request = vi.fn().mockResolvedValue({ accounts: [] });
    getInjectedProvider.mockReturnValue(injectedProvider(request));

    await expect(connectWallet({ transport })).resolves.toEqual({
      evm: { accounts: [] },
      solana: { accounts: [] },
    });
  });
});
