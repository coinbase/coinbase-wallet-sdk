import type { RequestArguments } from ':core/provider/interface.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import { numberToHex } from 'viem';
import { sessionFromAccounts } from '../session.js';
import * as providerUtil from ':util/provider.js';
import { createActiveChain } from './activeChain.js';
import { handleConnected } from './connected.js';
import type { Eip1193Context } from './context.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;
const OTHER = '0x0000000000000000000000000000000000000001' as const;
const CHAIN_ONE_ONLY = '0x0000000000000000000000000000000000000004' as const;

function context(
  send: WalletTransport['request'] = vi.fn(),
  initialSession = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 })
): Eip1193Context {
  let session = initialSession;
  const emit = vi.fn();
  const chain = createActiveChain({
    defaultChainId: 8453,
    session,
    onChange: (chainId) => emit('chainChanged', numberToHex(chainId)),
  });
  const state = {
    subAccounts: { get: () => undefined, set: vi.fn(), clear: vi.fn() },
    subAccountsConfig: { get: () => ({}), set: vi.fn(), clear: vi.fn() },
    spendPermissions: { get: () => [], set: vi.fn(), clear: vi.fn() },
    paymasterUrls: { get: () => undefined, set: vi.fn() },
  } as unknown as Store['eip155'];
  const transport: WalletTransport = {
    handshake: vi.fn(),
    request: async (request) => {
      const result = await send(request);
      if (request.method !== 'wallet_invokeMethod') return result;
      const params = request.params as {
        sessionId?: string;
        chainId: `eip155:${string}`;
        request: RequestArguments;
      };
      return {
        sessionId: params.sessionId,
        chainId: params.chainId,
        result: { method: params.request.method, result },
      };
    },
    readSession: () => session,
    writeSession: vi.fn((value) => {
      session = value;
    }),
    cleanup: vi.fn(),
  };
  return {
    transport,
    cache: state,
    config: { get: () => ({ version: 'test' }), set: vi.fn() },
    emit,
    chain,
  };
}

describe('handleConnected', () => {
  const session = {
    ...sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 }),
    properties: {
      chainMetadata: {
        'eip155:8453': { rpcUrl: 'https://example.invalid' },
      },
    },
  };
  const caip25Result = {
    sessionId: 'session-1',
    scopes: {
      eip155: {
        chains: ['8453'],
        accounts: [OTHER],
        methods: ['wallet_connect'],
        notifications: ['accountsChanged', 'chainChanged'],
      },
    },
  };

  it('projects accounts and chain id without hitting the transport', async () => {
    const send = vi.fn();
    const rt = context(send);
    await expect(handleConnected(rt, { method: 'eth_accounts' }, session)).resolves.toEqual([
      ADDRESS,
    ]);
    await expect(handleConnected(rt, { method: 'eth_coinbase' }, session)).resolves.toBe(ADDRESS);
    await expect(handleConnected(rt, { method: 'eth_chainId' }, session)).resolves.toBe('0x2105');
    await expect(handleConnected(rt, { method: 'net_version' }, session)).resolves.toBe(8453);
    await expect(
      handleConnected(rt, { method: 'wallet_getCapabilities', params: [ADDRESS] }, session)
    ).resolves.toEqual({
      '0x0': { gasLimitOverride: { supported: true } },
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('returns every account on the active chain and excludes other-chain grants', async () => {
    const multiAccountSession = sessionFromAccounts({
      accounts: [ADDRESS, OTHER],
      chainId: 8453,
    });
    multiAccountSession.scopes['eip155:1'] = {
      accounts: [`eip155:1:${CHAIN_ONE_ONLY}`],
      methods: [],
    };

    await expect(
      handleConnected(context(), { method: 'eth_accounts' }, multiAccountSession)
    ).resolves.toEqual([ADDRESS, OTHER]);
  });

  it('invokes personal_sign through the transport', async () => {
    const send = vi.fn().mockResolvedValue('0xsig');
    const rt = context(send);
    await expect(
      handleConnected(rt, { method: 'personal_sign', params: ['0x68656c6c6f'] }, session)
    ).resolves.toBe('0xsig');
    expect(send).toHaveBeenCalledWith({
      method: 'wallet_invokeMethod',
      params: {
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
      },
    });
  });

  it('ingests a standalone wallet_connect result', async () => {
    const connectResult = { accounts: [{ address: OTHER }] };
    const send = vi.fn().mockResolvedValue(caip25Result);
    const rt = context(send);
    const connectedSession = { ...session, sessionId: 'session-1' };

    await expect(
      handleConnected(
        rt,
        { method: 'wallet_connect', params: [{ version: '1' }] },
        connectedSession
      )
    ).resolves.toEqual(connectResult);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.objectContaining({ sessionId: 'session-1' }),
      })
    );
    expect(rt.transport.writeSession).toHaveBeenCalledTimes(1);
    expect(rt.transport.readSession()?.scopes['eip155:8453']?.accounts).toEqual([
      `eip155:8453:${OTHER}`,
    ]);
    expect(rt.chain.get()).toBe(8453);
  });

  it('rejects a malformed standalone wallet_createSession result', async () => {
    const passthrough = { status: 'pending' };
    const rt = context(vi.fn().mockResolvedValue(passthrough));

    await expect(
      handleConnected(rt, { method: 'wallet_connect', params: [{ version: '1' }] }, session)
    ).rejects.toMatchObject({ code: -32603 });

    expect(rt.transport.writeSession).not.toHaveBeenCalled();
  });

  it('ingests wallet_connect nested in wallet_invokeMethod', async () => {
    const connectResult = { accounts: [{ address: OTHER }] };
    const send = vi.fn().mockResolvedValue(caip25Result);
    const rt = context(send);

    await expect(
      handleConnected(
        rt,
        {
          method: 'wallet_invokeMethod',
          params: {
            chainId: 'eip155:8453',
            request: { method: 'wallet_connect', params: [{ version: '1' }] },
          },
        },
        session
      )
    ).resolves.toEqual(connectResult);

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ method: 'wallet_createSession' }));
    expect(rt.transport.writeSession).toHaveBeenCalledTimes(1);
    expect(rt.transport.readSession()?.scopes['eip155:8453']?.accounts).toEqual([
      `eip155:8453:${OTHER}`,
    ]);
    expect(rt.chain.get()).toBe(8453);
  });

  it('rejects a malformed nested wallet_createSession result', async () => {
    const passthrough = { status: 'pending' };
    const rt = context(vi.fn().mockResolvedValue(passthrough));

    await expect(
      handleConnected(
        rt,
        {
          method: 'wallet_invokeMethod',
          params: {
            chainId: 'eip155:8453',
            request: { method: 'wallet_connect', params: [{ version: '1' }] },
          },
        },
        session
      )
    ).rejects.toMatchObject({ code: -32603 });

    expect(rt.transport.writeSession).not.toHaveBeenCalled();
  });

  it('switches a known chain locally', async () => {
    const send = vi.fn();
    const rt = context(send);
    await expect(
      handleConnected(
        rt,
        { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x2105' }] },
        session
      )
    ).resolves.toBeNull();
    expect(rt.transport.writeSession).not.toHaveBeenCalled();
    expect(rt.chain.get()).toBe(8453);
    expect(rt.emit).not.toHaveBeenCalledWith('chainChanged', '0x2105');
    expect(send).not.toHaveBeenCalled();
  });

  it('switches an authorized chain with minimal metadata', async () => {
    const send = vi.fn();
    const rt = context(send);
    const authorizedTarget = {
      ...session,
      scopes: {
        ...session.scopes,
        'eip155:10': session.scopes['eip155:8453'],
      },
    };
    await expect(
      handleConnected(
        rt,
        { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa' }] },
        authorizedTarget
      )
    ).resolves.toBeNull();
    expect(rt.chain.get()).toBe(10);
    expect(rt.emit).toHaveBeenCalledWith('chainChanged', '0xa');
    expect(rt.transport.writeSession).not.toHaveBeenCalled();
    await expect(handleConnected(rt, { method: 'eth_chainId' }, authorizedTarget)).resolves.toBe(
      '0xa'
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('updates CAIP-25 before switching to a known ungranted chain', async () => {
    const sessionWithId = { ...session, sessionId: 'session-1' };
    const send = vi.fn().mockResolvedValue({
      sessionId: 'session-1',
      scopes: {
        ...Object.fromEntries(
          Object.entries(sessionWithId.scopes).map(([chainId, scope]) => [
            chainId,
            {
              accounts: scope.accounts.map((account) =>
                account.slice(account.lastIndexOf(':') + 1)
              ),
              methods: scope.methods,
              notifications: [],
            },
          ])
        ),
        'eip155:10': {
          accounts: [ADDRESS],
          methods: ['wallet_switchEthereumChain'],
          notifications: [],
        },
      },
    });
    const rt = context(send, sessionWithId);

    await expect(
      handleConnected(
        rt,
        { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa' }] },
        sessionWithId
      )
    ).resolves.toBeNull();

    expect(rt.transport.handshake).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.objectContaining({
          sessionId: 'session-1',
          scopes: {
            eip155: expect.objectContaining({
              chains: ['10'],
              params: [{ version: '1' }],
            }),
          },
        }),
      })
    );
    expect(rt.emit).toHaveBeenCalledWith('chainChanged', '0xa');
    expect(rt.transport.readSession()?.scopes['eip155:10']?.accounts).toEqual([
      `eip155:10:${ADDRESS}`,
    ]);
    expect(rt.chain.get()).toBe(10);
  });

  it('does not report a local switch when target authorization fails', async () => {
    const sessionWithId = { ...session, sessionId: 'session-1' };
    const rt = context(vi.fn().mockRejectedValue(new Error('rejected')), sessionWithId);

    await expect(
      handleConnected(
        rt,
        { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa' }] },
        sessionWithId
      )
    ).rejects.toThrow('rejected');
    expect(rt.emit).not.toHaveBeenCalledWith('chainChanged', '0xa');
  });

  it('forwards chain RPC when the method is not a wallet method', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue('0x1');
    const send = vi.fn();
    const rt = context(send);
    await expect(handleConnected(rt, { method: 'eth_blockNumber' }, session)).resolves.toBe('0x1');
    expect(fetchRPC).toHaveBeenCalledWith({ method: 'eth_blockNumber' }, 'https://example.invalid');
    expect(send).not.toHaveBeenCalled();
    fetchRPC.mockRestore();
  });
});
