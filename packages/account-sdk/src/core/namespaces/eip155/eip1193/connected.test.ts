import { createCaip27Request, sessionFromAccounts } from ':core/session/index.js';
import type { WalletRuntime } from ':core/transport/index.js';
import * as providerUtil from ':util/provider.js';
import { handleConnected } from './connected.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;
const OTHER = '0x0000000000000000000000000000000000000001' as const;

function runtime(
  send: WalletRuntime['send'] = vi.fn(),
  initialSession = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 })
): WalletRuntime {
  let session = initialSession;
  const chains = [{ id: 8453, rpcUrl: 'https://example.invalid' }];
  let chain: { id: number; rpcUrl?: string } = chains[0];
  return {
    store: {
      account: {
        get: () => ({ accounts: [ADDRESS], chain }),
        set: vi.fn((value: { chain?: { id: number; rpcUrl?: string } }) => {
          if (value.chain) chain = value.chain;
        }),
        clear: vi.fn(),
      },
      chains: { get: () => chains, set: vi.fn(), clear: vi.fn() },
      subAccounts: { get: () => undefined, set: vi.fn(), clear: vi.fn() },
      subAccountsConfig: { get: () => ({}), set: vi.fn(), clear: vi.fn() },
      spendPermissions: { get: () => [], set: vi.fn(), clear: vi.fn() },
    } as unknown as WalletRuntime['store'],
    emit: vi.fn(),
    chainId: () => chain.id,
    handshake: vi.fn(),
    send,
    transport: {
      kind: 'popup',
      send: async (envelope) => ({
        chainId: envelope.chainId,
        result: {
          method: envelope.request.method,
          result: await send(createCaip27Request(envelope)),
        },
      }),
    },
    readSession: () => session,
    writeSession: vi.fn((value) => {
      session = value;
    }),
    cleanup: vi.fn(),
  };
}

describe('handleConnected', () => {
  const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });

  it('projects accounts and chain id without hitting the transport', async () => {
    const send = vi.fn();
    const rt = runtime(send);
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

  it('invokes personal_sign through the transport', async () => {
    const send = vi.fn().mockResolvedValue('0xsig');
    const rt = runtime(send);
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
    const send = vi.fn().mockResolvedValue(connectResult);
    const rt = runtime(send);

    await expect(
      handleConnected(rt, { method: 'wallet_connect', params: [{ version: '1' }] }, session)
    ).resolves.toEqual(connectResult);

    expect(send).toHaveBeenCalledWith({
      method: 'wallet_invokeMethod',
      params: {
        chainId: 'eip155:8453',
        request: { method: 'wallet_connect', params: [{ version: '1' }] },
      },
    });
    expect(rt.writeSession).toHaveBeenCalledTimes(1);
    expect(rt.readSession()?.selected.eip155).toBe(`eip155:8453:${OTHER}`);
  });

  it('passes through a standalone wallet_connect non-connect result', async () => {
    const passthrough = { status: 'pending' };
    const rt = runtime(vi.fn().mockResolvedValue(passthrough));

    await expect(
      handleConnected(rt, { method: 'wallet_connect', params: [{ version: '1' }] }, session)
    ).resolves.toEqual(passthrough);

    expect(rt.writeSession).not.toHaveBeenCalled();
  });

  it('ingests wallet_connect nested in wallet_invokeMethod', async () => {
    const connectResult = { accounts: [{ address: OTHER }] };
    const send = vi.fn().mockResolvedValue(connectResult);
    const rt = runtime(send);

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

    expect(send).toHaveBeenCalledWith({
      method: 'wallet_invokeMethod',
      params: {
        chainId: 'eip155:8453',
        request: { method: 'wallet_connect', params: [{ version: '1' }] },
      },
    });
    expect(rt.writeSession).toHaveBeenCalledTimes(1);
    expect(rt.readSession()?.selected.eip155).toBe(`eip155:8453:${OTHER}`);
  });

  it('passes through nested wallet_connect non-connect result', async () => {
    const passthrough = { status: 'pending' };
    const rt = runtime(vi.fn().mockResolvedValue(passthrough));

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
    ).resolves.toEqual(passthrough);

    expect(rt.writeSession).not.toHaveBeenCalled();
  });

  it('switches a known chain locally', async () => {
    const send = vi.fn();
    const rt = runtime(send);
    await expect(
      handleConnected(
        rt,
        { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x2105' }] },
        session
      )
    ).resolves.toBeNull();
    expect(rt.writeSession).toHaveBeenCalled();
    expect(rt.emit).toHaveBeenCalledWith('chainChanged', '0x2105');
    expect(send).not.toHaveBeenCalled();
  });

  it('switches an authorized chain with minimal metadata', async () => {
    const send = vi.fn();
    const rt = runtime(send);
    rt.store.chains.get = () => [];
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
    expect(rt.store.account.set).toHaveBeenCalledWith({ chain: { id: 10 } });
    expect(rt.emit).toHaveBeenCalledWith('chainChanged', '0xa');
    expect(rt.writeSession).toHaveBeenCalled();
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
    const rt = runtime(send, sessionWithId);
    rt.store.chains.get = () => [
      { id: 8453, rpcUrl: 'https://example.invalid' },
      { id: 10, rpcUrl: 'https://op.invalid' },
    ];

    await expect(
      handleConnected(
        rt,
        { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa' }] },
        sessionWithId
      )
    ).resolves.toBeNull();

    expect(rt.handshake).not.toHaveBeenCalled();
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
    expect(rt.readSession()?.scopes['eip155:10']?.accounts).toEqual([`eip155:10:${ADDRESS}`]);
  });

  it('does not report a local switch when target authorization fails', async () => {
    const sessionWithId = { ...session, sessionId: 'session-1' };
    const rt = runtime(vi.fn().mockRejectedValue(new Error('rejected')), sessionWithId);
    rt.store.chains.get = () => [
      { id: 8453, rpcUrl: 'https://example.invalid' },
      { id: 10, rpcUrl: 'https://op.invalid' },
    ];

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
    const rt = runtime(send);
    await expect(handleConnected(rt, { method: 'eth_blockNumber' }, session)).resolves.toBe('0x1');
    expect(fetchRPC).toHaveBeenCalledWith({ method: 'eth_blockNumber' }, 'https://example.invalid');
    expect(send).not.toHaveBeenCalled();
    fetchRPC.mockRestore();
  });
});
