import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrorCodes } from ':core/error/constants.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import { numberToHex } from 'viem';
import { sessionFromAccounts } from '../session.js';
import { WALLET_METHODS } from '../methods.js';
import * as providerUtil from ':util/provider.js';
import type { Eip1193Context } from './context.js';
import { handleEip1193Request } from './request.js';
import { createActiveChain } from './activeChain.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

/**
 * Every JSON-RPC the Base Account `Signer` + `BaseAccountProvider` handled.
 * Destination must match that stack (popup = encrypted wallet, http = Coinbase
 * wallet RPC, chain = handshake rpcUrl, local = no I/O, session = handshake +
 * wallet_connect, ephemeral = handshake + one invoke + cleanup, reject = 4100).
 */
const SIGNER_POPUP_METHODS = [
  'personal_sign',
  'personal_ecRecover',
  'eth_ecRecover',
  'eth_signTransaction',
  'eth_sendTransaction',
  'eth_signTypedData',
  'eth_signTypedData_v1',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'wallet_sign',
  'wallet_sendCalls',
  'wallet_showCallsStatus',
  'wallet_grantPermissions',
  'wallet_addEthereumChain',
  'wallet_watchAsset',
] as const;

function context(opts?: { connected?: boolean }): Eip1193Context {
  const session = opts?.connected
    ? {
        ...sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 }),
        sessionId: 'session-1',
        properties: {
          chainMetadata: {
            'eip155:8453': { rpcUrl: 'https://example.invalid' },
          },
        },
      }
    : undefined;
  if (session) {
    session.scopes['eip155:8453'].capabilities = {
      atomic: { status: 'supported' },
    };
  }
  const send = vi.fn(async (request: RequestArguments) => {
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
              accounts: [ADDRESS],
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
        ? { accounts: [{ address: ADDRESS, capabilities: {} }] }
        : params.request.method === 'wallet_addSubAccount'
          ? { address: '0x0000000000000000000000000000000000000002' }
          : '0xok';
    return {
      sessionId: params.sessionId,
      chainId: params.chainId,
      result: { method: params.request.method, result },
    };
  });
  const emit = vi.fn();
  const state = {
    subAccounts: { get: () => undefined, set: vi.fn(), clear: vi.fn() },
    subAccountsConfig: { get: () => ({}), set: vi.fn(), clear: vi.fn() },
    spendPermissions: { get: () => [], set: vi.fn(), clear: vi.fn() },
    paymasterUrls: { get: () => undefined, set: vi.fn() },
  } as unknown as Store['eip155'];
  const transport: WalletTransport = {
    handshake: vi.fn().mockResolvedValue(undefined),
    request: send,
    readSession: () => session,
    writeSession: vi.fn(),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
  const chain = createActiveChain({
    defaultChainId: 8453,
    session,
    onChange: (chainId) => emit('chainChanged', numberToHex(chainId)),
  });
  return {
    transport,
    cache: state,
    config: { get: () => ({ version: 'test' }), set: vi.fn() },
    emit,
    chain,
  };
}

describe('RPC routing vs Base Account SDK', () => {
  it('sends every Signer popup method through the wallet transport when connected', async () => {
    for (const method of SIGNER_POPUP_METHODS) {
      expect(WALLET_METHODS.has(method)).toBe(true);
      const rt = context({ connected: true });
      await handleEip1193Request(rt, { method, params: [] });
      expect(rt.transport.request, method).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'wallet_invokeMethod',
          params: expect.objectContaining({
            request: expect.objectContaining({ method }),
          }),
        })
      );
    }
  });

  it('sends experimental_* to the wallet transport when connected (Signer prefix)', async () => {
    const rt = context({ connected: true });
    await handleEip1193Request(rt, { method: 'experimental_requestInfo', params: [] });
    expect(rt.transport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_invokeMethod',
        params: expect.objectContaining({
          request: expect.objectContaining({ method: 'experimental_requestInfo' }),
        }),
      })
    );
  });

  it.each([
    ['eth_accounts', [ADDRESS]],
    ['eth_coinbase', ADDRESS],
    ['eth_chainId', '0x2105'],
    ['net_version', 8453],
  ] as const)('projects %s locally when connected (no popup)', async (method, expected) => {
    const rt = context({ connected: true });
    await expect(handleEip1193Request(rt, { method })).resolves.toEqual(expected);
    expect(rt.transport.request).not.toHaveBeenCalled();
  });

  it('projects wallet_getCapabilities locally when connected', async () => {
    const rt = context({ connected: true });
    await expect(
      handleEip1193Request(rt, { method: 'wallet_getCapabilities', params: [ADDRESS] })
    ).resolves.toEqual({
      '0x0': { gasLimitOverride: { supported: true } },
      '0x2105': { atomic: { status: 'supported' } },
    });
    expect(rt.transport.request).not.toHaveBeenCalled();
  });

  it('routes wallet_connect through CAIP-25 when already connected', async () => {
    const rt = context({ connected: true });
    await handleEip1193Request(rt, { method: 'wallet_connect', params: [{ version: '1' }] });
    expect(rt.transport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.objectContaining({ scopes: expect.any(Object) }),
      })
    );
  });

  it('invokes wallet_addSubAccount when connected and nothing is cached', async () => {
    const rt = context({ connected: true });
    await handleEip1193Request(rt, {
      method: 'wallet_addSubAccount',
      params: [
        {
          version: '1',
          account: {
            type: 'create',
            keys: [{ type: 'address', publicKey: ADDRESS }],
          },
        },
      ],
    });
    expect(rt.transport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_invokeMethod',
        params: expect.objectContaining({
          request: expect.objectContaining({ method: 'wallet_addSubAccount' }),
        }),
      })
    );
  });

  it('stores disconnected wallet_switchEthereumChain locally', async () => {
    const rt = context();
    await expect(
      handleEip1193Request(rt, {
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }],
      })
    ).resolves.toBeUndefined();
    expect(rt.chain.get()).toBe(8453);
    expect(rt.transport.request).not.toHaveBeenCalled();
  });

  it('projects eth_requestAccounts locally when already connected', async () => {
    const rt = context({ connected: true });
    await expect(handleEip1193Request(rt, { method: 'eth_requestAccounts' })).resolves.toEqual([
      ADDRESS,
    ]);
    expect(rt.transport.handshake).not.toHaveBeenCalled();
    expect(rt.transport.request).not.toHaveBeenCalled();
  });

  it('pairs on eth_requestAccounts / wallet_connect when disconnected', async () => {
    for (const method of ['eth_requestAccounts', 'wallet_connect'] as const) {
      const rt = context();
      await handleEip1193Request(rt, { method });
      expect(rt.transport.handshake, method).toHaveBeenCalledWith({ method: 'handshake' });
      expect(rt.transport.request, method).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'wallet_createSession' })
      );
    }
  });

  it.each(['wallet_sendCalls', 'wallet_sign', 'experimental_requestInfo'] as const)(
    'invokes disconnected %s without creating a session',
    async (method) => {
      const rt = context();
      const params =
        method === 'wallet_sendCalls'
          ? [{ chainId: '0x2105', calls: [], version: '1' }]
          : method === 'wallet_sign'
            ? [{ version: '1.0', data: {} }]
            : [{ requests: [] }];

      await expect(handleEip1193Request(rt, { method, params })).resolves.toBe('0xok');
      expect(rt.transport.handshake).toHaveBeenCalled();
      expect(rt.transport.request).toHaveBeenCalledTimes(1);
      expect(rt.transport.request).toHaveBeenCalledWith({
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:8453',
          request: { method, params },
        },
      });
      expect(rt.transport.writeSession).not.toHaveBeenCalled();
      expect(rt.transport.cleanup).toHaveBeenCalledTimes(1);
    }
  );

  it('posts disconnected wallet_getCallsStatus to Coinbase HTTP', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({ status: 200 });
    const args: RequestArguments = { method: 'wallet_getCallsStatus', params: ['0x1'] };
    await handleEip1193Request(context(), args);
    expect(fetchRPC).toHaveBeenCalledWith(args, CB_WALLET_RPC_URL);
    fetchRPC.mockRestore();
  });

  it('posts connected wallet_getCallsStatus to the chain RPC (Signer default)', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({ status: 200 });
    const args: RequestArguments = { method: 'wallet_getCallsStatus', params: ['0x1'] };
    const rt = context({ connected: true });
    await handleEip1193Request(rt, args);
    expect(fetchRPC).toHaveBeenCalledWith(args, 'https://example.invalid');
    expect(rt.transport.request).not.toHaveBeenCalled();
    fetchRPC.mockRestore();
  });

  it('posts coinbase_fetchPermissions / coinbase_fetchPermission to Coinbase HTTP when connected', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({
      permissions: [],
      permission: { chainId: 8453 },
    });
    const rt = context({ connected: true });
    await handleEip1193Request(rt, {
      method: 'coinbase_fetchPermissions',
      params: [{ account: ADDRESS, chainId: '0x2105', spender: ADDRESS }],
    });
    expect(fetchRPC).toHaveBeenCalledWith(expect.anything(), CB_WALLET_RPC_URL);
    await handleEip1193Request(rt, {
      method: 'coinbase_fetchPermission',
      params: [{ permissionHash: '0xabc' }],
    });
    expect(fetchRPC).toHaveBeenCalledWith(expect.anything(), CB_WALLET_RPC_URL);
    expect(rt.transport.request).not.toHaveBeenCalled();
    fetchRPC.mockRestore();
  });

  it('reads wallet_getSubAccounts from chain RPC when nothing is cached', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({
      subAccounts: [],
    });
    const rt = context({ connected: true });
    await handleEip1193Request(rt, { method: 'wallet_getSubAccounts', params: [] });
    expect(fetchRPC).toHaveBeenCalledWith(
      { method: 'wallet_getSubAccounts', params: [] },
      'https://example.invalid'
    );
    expect(rt.transport.request).not.toHaveBeenCalled();
    fetchRPC.mockRestore();
  });

  it('forwards eth_getBalance / eth_call to the chain RPC when connected', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue('0x1');
    const rt = context({ connected: true });
    await handleEip1193Request(rt, { method: 'eth_getBalance', params: [ADDRESS, 'latest'] });
    await handleEip1193Request(rt, { method: 'eth_call', params: [{ to: ADDRESS }, 'latest'] });
    expect(fetchRPC).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'eth_getBalance' }),
      'https://example.invalid'
    );
    expect(fetchRPC).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'eth_call' }),
      'https://example.invalid'
    );
    expect(rt.transport.request).not.toHaveBeenCalled();
    fetchRPC.mockRestore();
  });

  it.each(['eth_accounts', 'eth_chainId', 'net_version'] as const)(
    'returns disconnected transport state for %s',
    async (method) => {
      const rt = context();
      const result = await handleEip1193Request(rt, { method });
      if (method === 'eth_accounts') expect(result).toEqual([]);
      if (method === 'eth_chainId') expect(result).toBe('0x2105');
      if (method === 'net_version') expect(result).toBe(8453);
      expect(rt.transport.request).not.toHaveBeenCalled();
    }
  );

  it.each([
    'wallet_getCapabilities',
    'wallet_getSubAccounts',
    'coinbase_fetchPermissions',
    'eth_getBalance',
  ] as const)('rejects disconnected %s until eth_requestAccounts (4100)', async (method) => {
    await expect(handleEip1193Request(context(), { method, params: [] })).rejects.toMatchObject({
      code: standardErrorCodes.provider.unauthorized,
    });
  });
});
