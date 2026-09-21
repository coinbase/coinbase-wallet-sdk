import { standardErrorCodes } from ':core/error/constants.js';
import { EIP155_METHODS } from ':core/namespaces/eip155/methods.js';
import { SOLANA_METHODS } from ':core/namespaces/solana/index.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { Session } from ':core/session/types.js';
import type { WalletTransport } from ':core/transport/index.js';
import { connectWallet } from './connect.js';

const EVM_ACCOUNT = '0x0000000000000000000000000000000000000001';
const SOLANA_ACCOUNT = 'So11111111111111111111111111111111111111112';
const EVM_CONNECT_METHODS = EIP155_METHODS.filter((method) => method !== 'wallet_addSubAccount');

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
          params?: unknown[];
        }
      >;
    };
    return {
      sessionId: params.sessionId ?? 'session-1',
      scopes: Object.fromEntries(
        Object.entries(params.scopes).map(([namespace, scope]) => {
          const { params: _params, ...grantedScope } = scope;
          return [
            namespace,
            {
              ...grantedScope,
              accounts: [namespace === 'solana' ? SOLANA_ACCOUNT : EVM_ACCOUNT],
              capabilities:
                namespace === 'solana'
                  ? {
                      supportedTransactionVersions: ['legacy', 0],
                      aos: { signature: 'solana-signature' },
                    }
                  : (grantedEvmCapabilities ?? {
                      aos: { signature: '0xevm-signature', isSCW: true },
                    }),
            },
          ];
        })
      ),
    };
  });
  const transport: WalletTransport = {
    handshake: vi.fn().mockResolvedValue(undefined),
    request,
    readSession: () => session,
    writeSession: vi.fn((next) => {
      session = next;
    }),
    cleanup: vi.fn(),
  };
  return { transport, request };
}

describe('connectWallet', () => {
  it('requests EVM and Solana accounts in one CAIP-25 session', async () => {
    const { transport, request } = setup();

    await expect(
      connectWallet({
        request: {
          evm: { capabilities: { aos: { nonce: 'evm-nonce' } } },
          solana: true,
        },
        transport,
      })
    ).resolves.toEqual({
      evm: {
        accounts: [
          {
            address: EVM_ACCOUNT,
            capabilities: { aos: { signature: '0xevm-signature', isSCW: true } },
          },
        ],
      },
      solana: {
        accounts: [{ address: SOLANA_ACCOUNT }],
      },
    });

    expect(transport.handshake).toHaveBeenCalledWith({ method: 'handshake' });
    expect(request).toHaveBeenCalledWith({
      method: 'wallet_createSession',
      params: {
        scopes: {
          eip155: {
            methods: EVM_CONNECT_METHODS,
            notifications: ['accountsChanged', 'chainChanged'],
            capabilities: { aos: { nonce: 'evm-nonce' } },
            params: [{ version: '1' }],
          },
          solana: {
            methods: SOLANA_METHODS,
            notifications: [],
          },
        },
      },
    });
  });

  it('rejects connection capabilities on solana, which the wallet does not accept', async () => {
    const { transport } = setup();

    await expect(
      connectWallet({
        request: { solana: { capabilities: { aos: { nonce: 'solana-nonce' } } } },
        transport,
      })
    ).rejects.toMatchObject({
      code: standardErrorCodes.rpc.invalidParams,
      message: 'Solana does not support connection capabilities',
    });
  });

  it('selects a basic EVM connection with true', async () => {
    const { transport, request } = setup();

    await expect(
      connectWallet({
        request: { evm: true },
        transport,
      })
    ).resolves.toEqual({
      evm: { accounts: [{ address: EVM_ACCOUNT }] },
    });

    expect(request).toHaveBeenCalledWith({
      method: 'wallet_createSession',
      params: {
        scopes: {
          eip155: {
            methods: EVM_CONNECT_METHODS,
            notifications: ['accountsChanged', 'chainChanged'],
            params: [{ version: '1' }],
          },
        },
      },
    });
  });

  it('selects a basic Solana connection with true without requiring EVM chains', async () => {
    const { transport, request } = setup();

    await expect(
      connectWallet({
        request: { solana: true },
        transport,
      })
    ).resolves.toEqual({
      solana: { accounts: [{ address: SOLANA_ACCOUNT }] },
    });

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

    await expect(
      connectWallet({
        transport,
      })
    ).resolves.toEqual({
      evm: { accounts: [{ address: EVM_ACCOUNT }] },
      solana: { accounts: [{ address: SOLANA_ACCOUNT }] },
    });

    const createSessionRequest = request.mock.calls[0]?.[0];
    expect(Object.keys((createSessionRequest?.params as { scopes: object }).scopes)).toEqual([
      'eip155',
      'solana',
    ]);
  });

  it('reuses an existing session', async () => {
    const restored: Session = {
      sessionId: 'session-1',
      namespaces: {
        eip155: {
          accounts: [EVM_ACCOUNT],
          methods: [...EIP155_METHODS],
        },
        solana: {
          accounts: [SOLANA_ACCOUNT],
          methods: [...SOLANA_METHODS],
        },
      },
    };
    const { transport, request } = setup({ restored });

    await expect(
      connectWallet({
        request: { evm: true, solana: true },
        transport,
      })
    ).resolves.toEqual({
      evm: { accounts: [{ address: EVM_ACCOUNT }] },
      solana: { accounts: [{ address: SOLANA_ACCOUNT }] },
    });

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
      request: { evm: { capabilities: { aos: { nonce: 'fresh' } } } },
      transport,
    });

    expect(transport.handshake).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ sessionId: 'session-1' }),
      })
    );
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
              params?: unknown[];
            }
          >;
        };
        const { params: _params, ...eip155Scope } = params.scopes.eip155;
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

    await expect(
      connectWallet({
        request: { evm: true, solana: true },
        transport,
      })
    ).resolves.toEqual({
      evm: { accounts: [{ address: EVM_ACCOUNT }] },
      solana: { accounts: [] },
    });
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

    await expect(
      connectWallet({
        request: { evm: true, solana: true },
        transport,
      })
    ).resolves.toEqual({
      evm: { accounts: [{ address: EVM_ACCOUNT }] },
      solana: { accounts: [{ address: SOLANA_ACCOUNT }] },
    });
  });

  it('returns requested capability results per account and marks omitted grants unsupported', async () => {
    const { transport, request } = setup({
      grantedEvmCapabilities: {
        aos: { signature: '0xevm-signature', isSCW: true },
        addSubAccount: { address: '0x0000000000000000000000000000000000000002' },
        spendPermissions: { permissionHash: '0xstale' },
      },
    });

    await expect(
      connectWallet({
        request: {
          evm: {
            capabilities: {
              aos: { nonce: 'nonce' },
              futureCapability: true,
              addSubAccount: true,
              spendPermissions: {},
            },
          },
        },
        transport,
      })
    ).resolves.toEqual({
      evm: {
        accounts: [
          {
            address: EVM_ACCOUNT,
            capabilities: {
              aos: { signature: '0xevm-signature', isSCW: true },
              futureCapability: {
                code: standardErrorCodes.provider.unsupportedMethod,
                message: 'Unsupported capability "futureCapability" for evm',
              },
              addSubAccount: {
                code: standardErrorCodes.provider.unsupportedMethod,
                message: 'Unsupported capability "addSubAccount" for evm',
              },
              spendPermissions: {
                code: standardErrorCodes.provider.unsupportedMethod,
                message: 'Unsupported capability "spendPermissions" for evm',
              },
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
              capabilities: {
                aos: { nonce: 'nonce' },
                futureCapability: true,
              },
            }),
          }),
        }),
      })
    );
  });

  it('rejects a popup grant when every requested namespace is empty', async () => {
    const { transport } = setup({
      result: (args) => {
        const params = args.params as {
          scopes: Record<string, { chains?: string[]; params?: unknown[] }>;
        };
        return {
          sessionId: 'empty-session',
          scopes: Object.fromEntries(
            Object.entries(params.scopes).map(([namespace, scope]) => {
              const { params: _params, ...grantedScope } = scope;
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
      connectWallet({
        request: { evm: true, solana: true },
        transport,
      })
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
        request: { bitcoin: true },
        transport,
      })
    ).rejects.toMatchObject({
      code: standardErrorCodes.rpc.invalidParams,
      message: 'Unsupported wallet namespace: bitcoin',
    });
    expect(transport.handshake).not.toHaveBeenCalled();
  });
});
