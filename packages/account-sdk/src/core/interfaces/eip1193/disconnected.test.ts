import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrorCodes } from ':core/error/constants.js';
import type { RequestArguments } from ':core/provider/interface.js';
import { toLegacyRequest } from ':core/translators/eip155/index.js';
import type { WalletRuntime } from ':core/transport/index.js';
import * as providerUtil from ':util/provider.js';
import { handleDisconnected } from './disconnected.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

function runtime(send: WalletRuntime['send'] = vi.fn()): WalletRuntime {
  let accounts: `0x${string}`[] = [];
  let chain = { id: 1 };
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
      chains: { get: () => [], set: vi.fn(), clear: vi.fn() },
      subAccounts: { get: () => undefined, set: vi.fn(), clear: vi.fn() },
      subAccountsConfig: { get: () => ({}), set: vi.fn(), clear: vi.fn() },
      spendPermissions: { get: () => [], set: vi.fn(), clear: vi.fn() },
      session: { get: () => undefined, set: vi.fn(), clear: vi.fn() },
    } as unknown as WalletRuntime['store'],
    chainId: () => chain.id,
    handshake: vi.fn().mockResolvedValue(undefined),
    send,
    transport: { kind: 'popup', send: (envelope) => send(toLegacyRequest(envelope)) },
    readSession: () => undefined,
    writeSession: vi.fn(),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
}

describe('handleDisconnected', () => {
  it('returns empty defaults before pairing', async () => {
    const rt = runtime();
    await expect(handleDisconnected(rt, { method: 'eth_accounts' })).resolves.toEqual([]);
    await expect(handleDisconnected(rt, { method: 'eth_chainId' })).resolves.toBe('0x1');
    await expect(handleDisconnected(rt, { method: 'net_version' })).resolves.toBe(1);
  });

  it('stores a local chain id on wallet_switchEthereumChain', async () => {
    const rt = runtime();
    await expect(
      handleDisconnected(rt, {
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }],
      })
    ).resolves.toBeUndefined();
    expect(rt.store.account.set).toHaveBeenCalledWith({ chain: { id: 8453 } });
  });

  it('pairs on eth_requestAccounts', async () => {
    const send = vi.fn().mockResolvedValue({
      accounts: [{ address: ADDRESS, capabilities: {} }],
    });
    const rt = runtime(send);
    await expect(handleDisconnected(rt, { method: 'eth_requestAccounts' })).resolves.toEqual([
      ADDRESS,
    ]);
    expect(rt.handshake).toHaveBeenCalledWith({ method: 'handshake' });
    expect(send).toHaveBeenCalledWith({
      method: 'wallet_connect',
      params: [{ version: '1' }],
    });
  });

  it('rejects wallet_invokeMethod before a session exists', async () => {
    await expect(
      handleDisconnected(runtime(), {
        method: 'wallet_invokeMethod',
        params: { chainId: 'eip155:1', request: { method: 'personal_sign' } },
      })
    ).rejects.toMatchObject({ code: 4100 });
  });

  it.each(['wallet_sendCalls', 'wallet_sign', 'experimental_requestInfo'] as const)(
    'one-shots handshake + envelope transport + cleanup for %s',
    async (method) => {
      const order: string[] = [];
      const send = vi.fn();
      const rt = runtime(send);
      const transportSend = vi.fn().mockImplementation(async () => {
        order.push('transport-start');
        await Promise.resolve();
        order.push('transport-end');
        return '0xok';
      });
      rt.handshake = vi.fn().mockImplementation(async () => {
        order.push('handshake');
      });
      rt.transport.send = transportSend;
      rt.cleanup = vi.fn().mockImplementation(async () => {
        order.push('cleanup');
      });

      const params =
        method === 'wallet_sendCalls'
          ? [{ chainId: '0x1', calls: [], version: '1' }]
          : method === 'wallet_sign'
            ? [{ version: '1.0', data: {} }]
            : [{ requests: [] }];
      const args: RequestArguments = { method, params };

      await expect(handleDisconnected(rt, args)).resolves.toBe('0xok');
      expect(rt.handshake).toHaveBeenCalledWith({ method: 'handshake' });
      expect(transportSend).toHaveBeenCalledWith({
        chainId: 'eip155:1',
        request: args,
      });
      expect(send).not.toHaveBeenCalled();
      expect(rt.cleanup).toHaveBeenCalled();
      expect(order).toEqual(['handshake', 'transport-start', 'transport-end', 'cleanup']);
    }
  );

  it('posts wallet_getCallsStatus to Coinbase HTTP', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({ status: 200 });
    const args: RequestArguments = { method: 'wallet_getCallsStatus', params: ['0x1'] };
    await expect(handleDisconnected(runtime(), args)).resolves.toEqual({ status: 200 });
    expect(fetchRPC).toHaveBeenCalledWith(args, CB_WALLET_RPC_URL);
    fetchRPC.mockRestore();
  });

  it('requires eth_requestAccounts for other methods', async () => {
    await expect(handleDisconnected(runtime(), { method: 'personal_sign' })).rejects.toMatchObject({
      code: standardErrorCodes.provider.unauthorized,
    });
  });
});
