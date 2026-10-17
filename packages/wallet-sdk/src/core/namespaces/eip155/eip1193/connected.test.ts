import type { RequestArguments } from ':core/provider/interface.js';
import type { WalletTransport } from ':core/transport/index.js';
import * as providerUtil from ':util/provider.js';
import { numberToHex } from 'viem';
import { isKnownEip155Chain } from '../session.js';
import { sessionFromAccounts } from '../session.fixtures.js';
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
    onChange: (chainId) => emit('chainChanged', numberToHex(chainId)),
  });
  // Every provider starts on Ethereum mainnet. These cases describe a provider a dapp has
  // already moved to Base, which only ever happens through a switch, so arrange it that
  // way and drop the arrange-time event before the assertions run.
  chain.select(8453);
  emit.mockClear();
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
    // This wallet reported no capabilities, and the SDK invents none.
    await expect(
      handleConnected(rt, { method: 'wallet_getCapabilities', params: [ADDRESS] }, session)
    ).resolves.toEqual({});
    expect(send).not.toHaveBeenCalled();
  });

  it('returns every authorized account in the namespace grant', async () => {
    // Consent is per account, not per chain: the one eip155 grant is the whole account
    // list, on chain 8453 and on every other EVM chain alike.
    const multiAccountSession = sessionFromAccounts({
      accounts: [ADDRESS, OTHER, CHAIN_ONE_ONLY],
      chainId: 8453,
    });

    await expect(
      handleConnected(context(), { method: 'eth_accounts' }, multiAccountSession)
    ).resolves.toEqual([ADDRESS, OTHER, CHAIN_ONE_ONLY]);
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
    expect(rt.transport.readSession()?.namespaces.eip155?.accounts).toEqual([OTHER]);
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

  it('rejects wallet_connect nested in wallet_invokeMethod', async () => {
    // Pairing is `wallet_connect` called directly. Nesting it inside an envelope that
    // already names a session is a contradiction, so it never reaches the wallet.
    const send = vi.fn();
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
    ).rejects.toThrow('wallet_connect cannot be nested inside wallet_invokeMethod');

    expect(send).not.toHaveBeenCalled();
    expect(rt.transport.writeSession).not.toHaveBeenCalled();
    expect(rt.chain.get()).toBe(8453);
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

  it('asks the wallet for a granted chain the catalog does not list', async () => {
    const send = vi.fn().mockResolvedValue(null);
    // The namespace-wide grant already authorizes chain 10; the catalog does not list it.
    const scopedTarget = {
      ...session,
      sessionId: 'session-1',
    };
    const rt = context(send, scopedTarget);

    await expect(
      handleConnected(
        rt,
        { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa' }] },
        scopedTarget
      )
    ).resolves.toBeNull();

    // A grant is authorization, not chain support. Only the wallet's chain
    // catalog makes a chain locally selectable, so this still round-trips.
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ method: 'wallet_invokeMethod' }));
    expect(rt.chain.get()).toBe(10);
    expect(rt.emit).toHaveBeenCalledWith('chainChanged', '0xa');
    await expect(handleConnected(rt, { method: 'eth_chainId' }, scopedTarget)).resolves.toBe('0xa');
  });

  it('switches a metadata-known ungranted chain without wallet I/O', async () => {
    const sessionWithId = {
      ...session,
      sessionId: 'session-1',
      properties: {
        chainMetadata: {
          'eip155:8453': { rpcUrl: 'https://example.invalid' },
          'eip155:10': { rpcUrl: 'https://optimism.invalid' },
        },
      },
    };
    const send = vi.fn();
    const rt = context(send, sessionWithId);

    await expect(
      handleConnected(
        rt,
        { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa' }] },
        sessionWithId
      )
    ).resolves.toBeNull();

    expect(send).not.toHaveBeenCalled();
    expect(rt.transport.writeSession).not.toHaveBeenCalled();
    expect(rt.emit).toHaveBeenCalledWith('chainChanged', '0xa');
    expect(rt.chain.get()).toBe(10);
  });

  it('routes a metadata-unknown chain to SCW and does not switch when authorization fails', async () => {
    const sessionWithId = { ...session, sessionId: 'session-1' };
    const send = vi.fn().mockRejectedValue(new Error('rejected'));
    const rt = context(send, sessionWithId);

    await expect(
      handleConnected(
        rt,
        { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa' }] },
        sessionWithId
      )
    ).rejects.toThrow('rejected');
    expect(send).toHaveBeenCalledWith({
      method: 'wallet_invokeMethod',
      params: {
        sessionId: 'session-1',
        chainId: 'eip155:8453',
        request: {
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xa' }],
        },
      },
    });
    expect(rt.emit).not.toHaveBeenCalledWith('chainChanged', '0xa');
  });

  it('catalogs and selects a metadata-unknown chain after SCW approves it', async () => {
    const sessionWithId = { ...session, sessionId: 'session-1' };
    const send = vi.fn().mockResolvedValue(null);
    const rt = context(send, sessionWithId);

    await expect(
      handleConnected(
        rt,
        { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa' }] },
        sessionWithId
      )
    ).resolves.toBeNull();

    expect(rt.chain.get()).toBe(10);
    expect(rt.emit).toHaveBeenCalledWith('chainChanged', '0xa');
    // The wallet accepting the chain grows its catalog, so later reads can reach it.
    expect(rt.transport.writeSession).toHaveBeenCalledTimes(1);
    const stored = rt.transport.readSession();
    expect(stored && isKnownEip155Chain(stored, 10)).toBe(true);
    expect(stored?.namespaces).toEqual(sessionWithId.namespaces);
  });

  it('does not re-connect on the first transaction after a local switch', async () => {
    const sessionWithId = {
      ...session,
      sessionId: 'session-1',
      properties: {
        chainMetadata: {
          'eip155:8453': { rpcUrl: 'https://example.invalid' },
          'eip155:10': { rpcUrl: 'https://optimism.invalid' },
        },
      },
    };
    const send = vi.fn().mockResolvedValue('0xhash');
    const rt = context(send, sessionWithId);

    await expect(
      handleConnected(
        rt,
        { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa' }] },
        sessionWithId
      )
    ).resolves.toBeNull();
    expect(send).not.toHaveBeenCalled();

    await expect(
      handleConnected(
        rt,
        { method: 'eth_sendTransaction', params: [{ from: ADDRESS }] },
        sessionWithId
      )
    ).resolves.toBe('0xhash');

    // The one EVM grant already authorizes the new chain, so nothing re-authorizes.
    expect(send).not.toHaveBeenCalledWith(
      expect.objectContaining({ method: 'wallet_createSession' })
    );
    expect(send).toHaveBeenCalledWith({
      method: 'wallet_invokeMethod',
      params: {
        sessionId: 'session-1',
        chainId: 'eip155:10',
        request: { method: 'eth_sendTransaction', params: [{ from: ADDRESS }] },
      },
    });
  });

  it('transacts after a switch without re-authorizing the target chain', async () => {
    const grantedBoth = {
      ...session,
      sessionId: 'session-1',
      properties: {
        chainMetadata: {
          'eip155:8453': { rpcUrl: 'https://example.invalid' },
          'eip155:10': { rpcUrl: 'https://optimism.invalid' },
        },
      },
    };
    const send = vi.fn().mockResolvedValue('0xhash');
    const rt = context(send, grantedBoth);

    await expect(
      handleConnected(
        rt,
        { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa' }] },
        grantedBoth
      )
    ).resolves.toBeNull();
    await expect(
      handleConnected(
        rt,
        { method: 'eth_sendTransaction', params: [{ from: ADDRESS }] },
        grantedBoth
      )
    ).resolves.toBe('0xhash');

    expect(send).not.toHaveBeenCalledWith(
      expect.objectContaining({ method: 'wallet_createSession' })
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ chainId: 'eip155:10' }),
      })
    );
  });

  it('still reports accounts after switching to another catalogued chain', async () => {
    const sessionWithId = {
      ...session,
      properties: {
        chainMetadata: {
          'eip155:8453': { rpcUrl: 'https://example.invalid' },
          'eip155:10': { rpcUrl: 'https://optimism.invalid' },
        },
      },
    };
    const send = vi.fn();
    const rt = context(send, sessionWithId);

    await handleConnected(
      rt,
      { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa' }] },
      sessionWithId
    );

    await expect(handleConnected(rt, { method: 'eth_accounts' }, sessionWithId)).resolves.toEqual([
      ADDRESS,
    ]);
    expect(send).not.toHaveBeenCalled();
  });

  it('transacts on any chain under the namespace-wide eip155 grant', async () => {
    const namespaceSession = {
      sessionId: 'session-1',
      namespaces: {
        eip155: { accounts: [ADDRESS], methods: ['eth_sendTransaction'] },
      },
      properties: {
        chainMetadata: {
          'eip155:8453': { rpcUrl: 'https://example.invalid' },
          'eip155:10': { rpcUrl: 'https://optimism.invalid' },
        },
      },
    };
    const send = vi.fn().mockResolvedValue('0xhash');
    const rt = context(send, namespaceSession);

    await expect(
      handleConnected(
        rt,
        { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa' }] },
        namespaceSession
      )
    ).resolves.toBeNull();
    await expect(
      handleConnected(
        rt,
        { method: 'eth_sendTransaction', params: [{ from: ADDRESS }] },
        namespaceSession
      )
    ).resolves.toBe('0xhash');

    // One grant, every chain: no re-authorization and no session write on switch.
    expect(send).not.toHaveBeenCalledWith(
      expect.objectContaining({ method: 'wallet_createSession' })
    );
    expect(rt.transport.writeSession).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith({
      method: 'wallet_invokeMethod',
      params: {
        sessionId: 'session-1',
        chainId: 'eip155:10',
        request: { method: 'eth_sendTransaction', params: [{ from: ADDRESS }] },
      },
    });
    await expect(
      handleConnected(rt, { method: 'eth_accounts' }, namespaceSession)
    ).resolves.toEqual([ADDRESS]);
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
