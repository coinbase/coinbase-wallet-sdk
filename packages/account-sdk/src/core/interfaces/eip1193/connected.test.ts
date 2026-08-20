import { sessionFromAccounts } from ':core/session/index.js';
import { toLegacyRequest } from ':core/translators/eip155/index.js';
import type { WalletRuntime } from ':core/transport/index.js';
import * as providerUtil from ':util/provider.js';
import { handleConnected } from './connected.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

function runtime(send: WalletRuntime['send'] = vi.fn()): WalletRuntime {
  const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
  const chains = [{ id: 8453, rpcUrl: 'https://example.invalid' }];
  return {
    store: {
      account: {
        get: () => ({ accounts: [ADDRESS], chain: chains[0] }),
        set: vi.fn(),
        clear: vi.fn(),
      },
      chains: { get: () => chains, set: vi.fn(), clear: vi.fn() },
      subAccounts: { get: () => undefined, set: vi.fn(), clear: vi.fn() },
      subAccountsConfig: { get: () => ({}), set: vi.fn(), clear: vi.fn() },
      spendPermissions: { get: () => [], set: vi.fn(), clear: vi.fn() },
    } as unknown as WalletRuntime['store'],
    emit: vi.fn(),
    chainId: () => 8453,
    handshake: vi.fn(),
    send,
    transport: { kind: 'popup', send: (envelope) => send(toLegacyRequest(envelope)) },
    readSession: () => session,
    writeSession: vi.fn(),
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
    expect(send).not.toHaveBeenCalled();
  });

  it('invokes personal_sign through the transport', async () => {
    const send = vi.fn().mockResolvedValue('0xsig');
    const rt = runtime(send);
    await expect(
      handleConnected(rt, { method: 'personal_sign', params: ['0x68656c6c6f'] }, session)
    ).resolves.toBe('0xsig');
    expect(send).toHaveBeenCalledWith({
      method: 'personal_sign',
      params: ['0x68656c6c6f'],
    });
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

  it('invokes wallet_switchEthereumChain when the chain is unknown', async () => {
    const send = vi.fn().mockResolvedValue(null);
    const rt = runtime(send);
    rt.store.chains.get = () => [];
    await handleConnected(
      rt,
      { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa' }] },
      session
    );
    expect(send).toHaveBeenCalledWith({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xa' }],
    });
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
