import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrorCodes } from ':core/error/constants.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { WalletTransport } from ':core/transport/index.js';
import * as providerUtil from ':util/provider.js';
import { numberToHex } from 'viem';
import { EIP155_METHODS } from '../methods.js';
import { sessionFromAccounts } from '../session.fixtures.js';
import { createActiveChain } from './activeChain.js';
import type { Eip1193Context } from './context.js';
import { handleEip1193Request } from './request.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

/**
 * Every JSON-RPC the Coinbase Wallet `Signer` + `CoinbaseWalletProvider` handled.
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
  const granted = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
  const session = opts?.connected
    ? {
        ...granted,
        sessionId: 'session-1',
        namespaces: {
          ...granted.namespaces,
          // Capabilities the wallet reports as holding on every chain ride on the grant.
          eip155: {
            ...granted.namespaces.eip155,
            capabilities: { gasLimitOverride: { supported: true } },
          },
        },
        properties: {
          chainMetadata: {
            // Capabilities that genuinely differ per chain arrive in the wallet's chain
            // catalog, alongside the namespace-wide `eip155` grant.
            'eip155:8453': {
              rpcUrl: 'https://example.invalid',
              capabilities: { atomic: { status: 'supported' } },
            },
          },
        },
      }
    : undefined;
  const send = vi.fn(async (request: RequestArguments) => {
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
        sessionId: 'session-1',
        scopes: Object.fromEntries(
          Object.entries(params.scopes).map(([scopeKey, scope]) => [
            scopeKey,
            {
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
  const transport: WalletTransport = {
    handshake: vi.fn().mockResolvedValue(undefined),
    request: send,
    readSession: () => session,
    writeSession: vi.fn(),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
  const chain = createActiveChain({
    onChange: (chainId) => emit('chainChanged', numberToHex(chainId)),
  });
  if (session) {
    // Every provider starts on Ethereum mainnet. The connected cases describe a dapp that
    // has already switched to Base, which only happens through a switch, so arrange it
    // that way and drop the arrange-time event before the assertions run.
    chain.select(8453);
    emit.mockClear();
  }
  return {
    transport,
    emit,
    chain,
  };
}

describe('RPC routing vs Coinbase Wallet SDK', () => {
  it('sends every Signer popup method through the wallet transport when connected', async () => {
    for (const method of SIGNER_POPUP_METHODS) {
      expect(EIP155_METHODS).toContain(method);
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

  it('stores disconnected wallet_switchEthereumChain locally', async () => {
    const rt = context();
    await expect(
      handleEip1193Request(rt, {
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }],
      })
    ).resolves.toBeUndefined();
    expect(rt.chain.get()).toBe(8453);
    expect(rt.emit).toHaveBeenCalledWith('chainChanged', '0x2105');
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
      // No switch happened, so the one-shot rides the chain every provider starts on.
      expect(rt.transport.request).toHaveBeenCalledWith({
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:1',
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
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({});
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
      if (method === 'eth_chainId') expect(result).toBe('0x1');
      if (method === 'net_version') expect(result).toBe(1);
      expect(rt.transport.request).not.toHaveBeenCalled();
    }
  );

  it.each([
    'wallet_getCapabilities',
    'wallet_getSubAccounts',
    'coinbase_fetchPermissions',
    'eth_getBalance',
    'personal_sign',
    'eth_sendTransaction',
    'eth_signTypedData_v4',
    'wallet_grantPermissions',
  ] as const)('rejects disconnected %s until eth_requestAccounts (4100)', async (method) => {
    const rt = context();
    await expect(handleEip1193Request(rt, { method, params: [] })).rejects.toMatchObject({
      code: standardErrorCodes.provider.unauthorized,
    });
    expect(rt.transport.request, method).not.toHaveBeenCalled();
  });
});
