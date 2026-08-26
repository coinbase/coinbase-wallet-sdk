import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { WalletRuntime } from ':core/transport/index.js';
import type { ToOwnerAccountFn } from ':store/store.js';
import type { Caip2 } from './caip.js';
import { projectEthAccounts, sessionFromAccounts } from './eip155.js';
import {
  ingestConnectResult,
  pair,
  walletConnectParams,
  walletConnectScopeRequestParts,
} from './pair.js';

const ADDRESS = '0x0000000000000000000000000000000000000001';
const SUB = '0x0000000000000000000000000000000000000002';
const OWNER = '0x00000000000000000000000000000000000000aa';

function runtime(
  send: WalletRuntime['send'],
  opts?: {
    defaultAccount?: 'sub' | 'universal';
    creation?: 'on-connect' | 'manual';
    toOwnerAccount?: ToOwnerAccountFn;
    chainId?: number;
  }
): WalletRuntime {
  const sessionStore: { current?: Parameters<WalletRuntime['writeSession']>[0] } = {};
  let accounts: `0x${string}`[] = [];
  let chain = { id: opts?.chainId ?? 1 };
  let subAccount: { address: `0x${string}` } | undefined;
  let subAccountsConfig = {
    defaultAccount: opts?.defaultAccount,
    creation: opts?.creation,
    toOwnerAccount: opts?.toOwnerAccount,
    capabilities: undefined as Record<string, unknown> | undefined,
  };
  return {
    store: {
      account: {
        get: () => ({ accounts, chain }),
        set: vi.fn((value: { accounts?: `0x${string}`[]; chain?: { id: number } }) => {
          if (value.accounts) accounts = value.accounts;
          if (value.chain) chain = value.chain;
        }),
        clear: vi.fn(),
      },
      chains: {
        get: () => [{ id: 1 }, { id: 8453 }],
        set: vi.fn(),
        clear: vi.fn(),
      },
      spendPermissions: {
        get: () => [],
        set: vi.fn(),
        clear: vi.fn(),
      },
      subAccounts: {
        get: () => subAccount,
        set: vi.fn((value: { address: `0x${string}` }) => {
          subAccount = { ...subAccount, ...value };
        }),
        clear: vi.fn(),
      },
      subAccountsConfig: {
        get: () => subAccountsConfig,
        set: vi.fn((value: Partial<typeof subAccountsConfig>) => {
          subAccountsConfig = { ...subAccountsConfig, ...value };
        }),
        clear: vi.fn(),
      },
    } as unknown as WalletRuntime['store'],
    emit: vi.fn(),
    chainId: () => chain.id,
    handshake: vi.fn().mockResolvedValue(undefined),
    send,
    transport: { kind: 'popup', send: vi.fn() },
    readSession: () => sessionStore.current,
    writeSession: (session) => {
      sessionStore.current = session;
    },
    cleanup: vi.fn(),
  };
}

describe('walletConnect request parts', () => {
  it('defaults to version 1 with no capabilities', () => {
    expect(walletConnectScopeRequestParts()).toEqual({ params: [{ version: '1' }] });
    expect(walletConnectParams()).toEqual([{ version: '1' }]);
    expect(walletConnectParams({ method: 'wallet_connect' })).toEqual([{ version: '1' }]);
  });

  it('separates capabilities from preserved params while keeping dapp precedence', () => {
    const request: RequestArguments = {
      method: 'wallet_connect',
      params: [
        {
          version: '1',
          optionalMetadata: 'preserved',
          capabilities: {
            signInWithEthereum: { nonce: 'abc', chainId: '0x1' },
            addSubAccount: { account: { type: 'create' } },
            extra: { foo: 1 },
          },
        },
      ],
    };
    expect(
      walletConnectScopeRequestParts(request, {
        spendPermissions: { 8453: [] },
        extra: { foo: 0 },
      })
    ).toEqual({
      params: [{ version: '1', optionalMetadata: 'preserved' }],
      capabilities: {
        spendPermissions: { 8453: [] },
        signInWithEthereum: { nonce: 'abc', chainId: '0x1' },
        addSubAccount: { account: { type: 'create' } },
        extra: { foo: 1 },
      },
    });
    expect(
      walletConnectParams(request, {
        spendPermissions: { 8453: [] },
        extra: { foo: 0 },
      })
    ).toEqual([
      {
        version: '1',
        optionalMetadata: 'preserved',
        capabilities: {
          spendPermissions: { 8453: [] },
          signInWithEthereum: { nonce: 'abc', chainId: '0x1' },
          addSubAccount: { account: { type: 'create' } },
          extra: { foo: 1 },
        },
      },
    ]);
  });
});

describe('pair', () => {
  it('sends canonical eip155 scope request extensions', async () => {
    const send = vi.fn().mockResolvedValue({
      sessionId: 'session-1',
      scopes: {
        eip155: {
          chains: ['1'],
          accounts: [ADDRESS],
          methods: ['personal_sign', 'wallet_connect'],
          notifications: ['accountsChanged', 'chainChanged'],
          capabilities: { signInWithEthereum: { message: 'm' } },
        },
      },
    });
    const rt = runtime(send);
    const request: RequestArguments = {
      method: 'wallet_connect',
      params: [
        {
          version: '1',
          capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x1' } },
        },
      ],
    };

    const { result } = await pair(rt, request);

    expect(rt.handshake).toHaveBeenCalledWith({ method: 'handshake' });
    expect(send).toHaveBeenCalledWith({
      method: 'wallet_createSession',
      params: {
        scopes: {
          eip155: {
            chains: ['1'],
            methods: expect.arrayContaining(['personal_sign', 'wallet_connect']),
            notifications: ['accountsChanged', 'chainChanged'],
            capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x1' } },
            params: [{ version: '1' }],
          },
        },
      },
    });
    expect(result).toMatchObject({
      accounts: [
        {
          address: ADDRESS,
          capabilities: { signInWithEthereum: { message: 'm' } },
        },
      ],
    });
    expect(rt.readSession()?.sessionId).toBe('session-1');
  });

  it('throws standardized unauthorized when CAIP-25 grants no accounts', async () => {
    const send = vi.fn().mockResolvedValue({
      sessionId: 'session-1',
      scopes: {
        eip155: {
          chains: ['1'],
          accounts: [],
          methods: ['personal_sign'],
          notifications: [],
        },
      },
    });

    await expect(pair(runtime(send))).rejects.toMatchObject({
      code: 4100,
      message: 'wallet_createSession did not grant accounts for eip155:1',
    });
  });

  it('injects addSubAccount when creation is on-connect', async () => {
    const send = vi.fn().mockResolvedValue({
      sessionId: 'session-1',
      scopes: {
        eip155: {
          chains: ['1'],
          accounts: [ADDRESS],
          methods: ['personal_sign'],
          notifications: [],
        },
      },
    });
    const rt = runtime(send, {
      creation: 'on-connect',
      toOwnerAccount: (async () => ({
        account: { type: 'local', address: OWNER },
      })) as unknown as ToOwnerAccountFn,
    });

    await pair(rt);

    expect(send).toHaveBeenCalledWith({
      method: 'wallet_createSession',
      params: {
        scopes: {
          eip155: {
            chains: ['1'],
            methods: expect.any(Array),
            notifications: ['accountsChanged', 'chainChanged'],
            capabilities: {
              addSubAccount: {
                account: {
                  type: 'create',
                  keys: [{ type: 'address', publicKey: OWNER }],
                },
              },
            },
            params: [{ version: '1' }],
          },
        },
      },
    });
  });

  it('ingests the exact required chain instead of the provider default', async () => {
    const send = vi.fn().mockResolvedValue({
      sessionId: 'session-base',
      scopes: {
        eip155: {
          chains: ['8453'],
          accounts: [ADDRESS],
          methods: ['personal_sign'],
          notifications: [],
        },
      },
    });
    const rt = runtime(send, { chainId: 1 });

    const { session } = await pair(rt, undefined, {
      chainId: 'eip155:8453',
      methods: ['personal_sign'],
    });

    expect(session.scopes['eip155:8453']?.accounts).toEqual([`eip155:8453:${ADDRESS}`]);
    expect(session.scopes['eip155:1']).toBeUndefined();
    expect(rt.store.account.set).toHaveBeenCalledWith({
      accounts: [ADDRESS],
      chain: { id: 8453 },
    });
    expect(rt.emit).toHaveBeenCalledWith('connect', { chainId: '0x2105' });
  });

  it('reuses restored keys when updating the same persisted session', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        sessionId: 'session-1',
        scopes: {
          'eip155:1': {
            accounts: [ADDRESS],
            methods: ['personal_sign'],
            notifications: [],
          },
        },
      })
      .mockResolvedValueOnce({
        sessionId: 'session-1',
        scopes: {
          'eip155:1': {
            accounts: [ADDRESS],
            methods: ['personal_sign'],
            notifications: [],
          },
          'eip155:8453': {
            accounts: [ADDRESS],
            methods: ['personal_sign'],
            notifications: [],
          },
        },
      });
    const rt = runtime(send);

    await pair(rt, undefined, { methods: ['personal_sign'] });
    await pair(rt, undefined, {
      chainId: 'eip155:8453',
      methods: ['personal_sign'],
      sessionId: 'session-1',
    });

    expect(rt.handshake).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.objectContaining({ sessionId: 'session-1' }),
      })
    );
  });

  it('recovers a stale persisted authorization with one fresh handshake and session', async () => {
    const order: string[] = [];
    const send = vi.fn(async (request: RequestArguments) => {
      const sessionId = (request.params as { sessionId?: string }).sessionId;
      order.push(`send:${sessionId ?? 'fresh'}`);
      if (sessionId) throw standardErrors.provider.unauthorized();
      return {
        sessionId: 'session-2',
        scopes: {
          'eip155:8453': {
            accounts: [ADDRESS],
            methods: ['personal_sign'],
            notifications: [],
          },
        },
      };
    });
    const rt = runtime(send);
    rt.writeSession({
      ...sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 }),
      sessionId: 'session-1',
    });
    rt.handshake = vi.fn(async () => {
      order.push('handshake');
    });

    const { session } = await pair(rt, undefined, {
      chainId: 'eip155:8453',
      methods: ['personal_sign'],
      sessionId: 'session-1',
    });

    expect(order).toEqual(['send:session-1', 'handshake', 'send:fresh']);
    expect(rt.handshake).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.not.objectContaining({ sessionId: expect.anything() }),
      })
    );
    expect(session.sessionId).toBe('session-2');
    expect(session.scopes['eip155:8453']).toBeDefined();
    expect(session.scopes['eip155:1']).toBeUndefined();
  });

  it.each([
    ['user rejection', () => standardErrors.provider.userRejectedRequest()],
    ['invalid params', () => standardErrors.rpc.invalidParams()],
    ['other error', () => new Error('transport failed')],
  ])('does not retry a persisted-session update after %s', async (_name, createError) => {
    const error = createError();
    const send = vi.fn().mockRejectedValue(error);
    const rt = runtime(send);
    rt.writeSession({
      ...sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 }),
      sessionId: 'session-1',
    });

    await expect(
      pair(rt, undefined, {
        chainId: 'eip155:8453',
        methods: ['personal_sign'],
        sessionId: 'session-1',
      })
    ).rejects.toBe(error);
    expect(send).toHaveBeenCalledTimes(1);
    expect(rt.handshake).not.toHaveBeenCalled();
  });
});

describe('ingestConnectResult', () => {
  it('throws standardized unsupported-chain for a non-EVM target', () => {
    expect(() =>
      ingestConnectResult(
        runtime(vi.fn()),
        { accounts: [{ address: ADDRESS }] },
        undefined,
        'solana:mainnet' as Caip2
      )
    ).toThrowError(
      expect.objectContaining({
        code: 4902,
        message: 'Unsupported wallet_connect chain: solana:mainnet',
      })
    );
  });

  it('persists accounts and a granted sub-account', () => {
    const send = vi.fn();
    const rt = runtime(send);
    const session = ingestConnectResult(rt, {
      accounts: [
        {
          address: ADDRESS,
          capabilities: {
            signInWithEthereum: { message: 'm' },
            subAccounts: [{ address: SUB }],
          },
        },
      ],
    });

    expect(projectEthAccounts(session)).toEqual([ADDRESS, SUB]);
    expect(rt.store.subAccounts.set).toHaveBeenCalledWith(
      expect.objectContaining({ address: SUB })
    );
  });

  it('does not overwrite handshake EIP-5792 capabilities with wallet_connect grants', () => {
    const rt = runtime(vi.fn());
    ingestConnectResult(rt, {
      accounts: [
        {
          address: ADDRESS,
          capabilities: { signInWithEthereum: { message: 'm' } },
        },
      ],
    });

    expect(rt.store.account.set).toHaveBeenCalledWith(
      expect.not.objectContaining({
        capabilities: expect.objectContaining({ signInWithEthereum: { message: 'm' } }),
      })
    );
  });

  it('puts the sub-account first when defaultAccount is sub', () => {
    const rt = runtime(vi.fn(), { defaultAccount: 'sub' });
    const session = ingestConnectResult(rt, {
      accounts: [
        {
          address: ADDRESS,
          capabilities: { subAccounts: [{ address: SUB }] },
        },
      ],
    });

    expect(projectEthAccounts(session)).toEqual([SUB, ADDRESS]);
  });
});
