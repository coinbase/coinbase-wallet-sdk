import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrorCodes } from ':core/error/constants.js';
import type { RequestArguments } from ':core/provider/interface.js';
import { sessionFromAccounts } from ':core/session/index.js';
import { WALLET_METHODS } from ':core/translators/eip155/index.js';
import { toLegacyRequest } from ':core/translators/eip155/index.js';
import type { WalletRuntime } from ':core/transport/index.js';
import * as providerUtil from ':util/provider.js';
import { handleEip1193Request } from './request.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

/**
 * Every JSON-RPC the Base Account `Signer` + `BaseAccountProvider` handled.
 * Destination must match that stack (popup = encrypted wallet, http = Coinbase
 * wallet RPC, chain = handshake rpcUrl, local = no I/O, pair = handshake +
 * wallet_connect, reject = 4100 before pair).
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

function runtime(opts?: { connected?: boolean }): WalletRuntime {
  const session = opts?.connected
    ? sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 })
    : undefined;
  const send = vi.fn().mockResolvedValue({
    accounts: [{ address: ADDRESS, capabilities: {} }],
  });
  const chains = [{ id: 8453, rpcUrl: 'https://example.invalid' }];
  return {
    store: {
      account: {
        get: () => ({
          accounts: opts?.connected ? [ADDRESS] : [],
          chain: chains[0],
          capabilities: { '0x1': { atomic: { status: 'supported' } } },
        }),
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
    handshake: vi.fn().mockResolvedValue(undefined),
    send,
    transport: { kind: 'popup', send: (envelope) => send(toLegacyRequest(envelope)) },
    readSession: () => session,
    writeSession: vi.fn(),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
}

describe('RPC routing vs Base Account SDK', () => {
  it('sends every Signer popup method through the wallet transport when connected', async () => {
    for (const method of SIGNER_POPUP_METHODS) {
      expect(WALLET_METHODS.has(method)).toBe(true);
      const rt = runtime({ connected: true });
      await handleEip1193Request(rt, { method, params: [] });
      expect(rt.send, method).toHaveBeenCalledWith(expect.objectContaining({ method }));
    }
  });

  it('sends experimental_* to the wallet transport when connected (Signer prefix)', async () => {
    const rt = runtime({ connected: true });
    await handleEip1193Request(rt, { method: 'experimental_requestInfo', params: [] });
    expect(rt.send).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'experimental_requestInfo' })
    );
  });

  it.each([
    ['eth_accounts', [ADDRESS]],
    ['eth_coinbase', ADDRESS],
    ['eth_chainId', '0x2105'],
    ['net_version', 8453],
  ] as const)('projects %s locally when connected (no popup)', async (method, expected) => {
    const rt = runtime({ connected: true });
    await expect(handleEip1193Request(rt, { method })).resolves.toEqual(expected);
    expect(rt.send).not.toHaveBeenCalled();
  });

  it('projects wallet_getCapabilities locally when connected', async () => {
    const rt = runtime({ connected: true });
    await expect(
      handleEip1193Request(rt, { method: 'wallet_getCapabilities', params: [ADDRESS] })
    ).resolves.toEqual({
      '0x0': { gasLimitOverride: { supported: true } },
      '0x1': { atomic: { status: 'supported' } },
    });
    expect(rt.send).not.toHaveBeenCalled();
  });

  it('re-pairs wallet_connect through invoke when already connected', async () => {
    const rt = runtime({ connected: true });
    await handleEip1193Request(rt, { method: 'wallet_connect', params: [{ version: '1' }] });
    expect(rt.send).toHaveBeenCalledWith(expect.objectContaining({ method: 'wallet_connect' }));
  });

  it('invokes wallet_addSubAccount when connected and nothing is cached', async () => {
    const rt = runtime({ connected: true });
    rt.send = vi.fn().mockResolvedValue({
      address: '0x0000000000000000000000000000000000000002',
    });
    rt.transport.send = (envelope) => rt.send(toLegacyRequest(envelope));
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
    expect(rt.send).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'wallet_addSubAccount' })
    );
  });

  it('stores disconnected wallet_switchEthereumChain locally', async () => {
    const rt = runtime();
    await expect(
      handleEip1193Request(rt, {
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }],
      })
    ).resolves.toBeUndefined();
    expect(rt.store.account.set).toHaveBeenCalledWith({ chain: { id: 8453 } });
    expect(rt.send).not.toHaveBeenCalled();
  });

  it('projects eth_requestAccounts locally when already connected', async () => {
    const rt = runtime({ connected: true });
    await expect(handleEip1193Request(rt, { method: 'eth_requestAccounts' })).resolves.toEqual([
      ADDRESS,
    ]);
    expect(rt.handshake).not.toHaveBeenCalled();
    expect(rt.send).not.toHaveBeenCalled();
  });

  it('pairs on eth_requestAccounts / wallet_connect when disconnected', async () => {
    for (const method of ['eth_requestAccounts', 'wallet_connect'] as const) {
      const rt = runtime();
      await handleEip1193Request(rt, { method });
      expect(rt.handshake, method).toHaveBeenCalledWith({ method: 'handshake' });
      expect(rt.send, method).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'wallet_connect' })
      );
    }
  });

  it.each(['wallet_sendCalls', 'wallet_sign', 'experimental_requestInfo'] as const)(
    'one-shots handshake+envelope transport+cleanup for disconnected %s',
    async (method) => {
      const rt = runtime();
      const transportSend = vi.fn().mockResolvedValue('0xok');
      rt.transport.send = transportSend;
      const params =
        method === 'wallet_sendCalls'
          ? [{ chainId: '0x2105', calls: [], version: '1' }]
          : method === 'wallet_sign'
            ? [{ version: '1.0', data: {} }]
            : [{ requests: [] }];

      await expect(handleEip1193Request(rt, { method, params })).resolves.toBe('0xok');
      expect(rt.handshake).toHaveBeenCalled();
      expect(transportSend).toHaveBeenCalledWith({
        chainId: 'eip155:8453',
        request: { method, params },
      });
      expect(rt.send).not.toHaveBeenCalled();
      expect(rt.cleanup).toHaveBeenCalled();
    }
  );

  it('posts disconnected wallet_getCallsStatus to Coinbase HTTP', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({ status: 200 });
    const args: RequestArguments = { method: 'wallet_getCallsStatus', params: ['0x1'] };
    await handleEip1193Request(runtime(), args);
    expect(fetchRPC).toHaveBeenCalledWith(args, CB_WALLET_RPC_URL);
    fetchRPC.mockRestore();
  });

  it('posts connected wallet_getCallsStatus to the chain RPC (Signer default)', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({ status: 200 });
    const args: RequestArguments = { method: 'wallet_getCallsStatus', params: ['0x1'] };
    const rt = runtime({ connected: true });
    await handleEip1193Request(rt, args);
    expect(fetchRPC).toHaveBeenCalledWith(args, 'https://example.invalid');
    expect(rt.send).not.toHaveBeenCalled();
    fetchRPC.mockRestore();
  });

  it('posts coinbase_fetchPermissions / coinbase_fetchPermission to Coinbase HTTP when connected', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({
      permissions: [],
      permission: { chainId: 8453 },
    });
    const rt = runtime({ connected: true });
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
    expect(rt.send).not.toHaveBeenCalled();
    fetchRPC.mockRestore();
  });

  it('reads wallet_getSubAccounts from chain RPC when nothing is cached', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({
      subAccounts: [],
    });
    const rt = runtime({ connected: true });
    await handleEip1193Request(rt, { method: 'wallet_getSubAccounts', params: [] });
    expect(fetchRPC).toHaveBeenCalledWith(
      { method: 'wallet_getSubAccounts', params: [] },
      'https://example.invalid'
    );
    expect(rt.send).not.toHaveBeenCalled();
    fetchRPC.mockRestore();
  });

  it('forwards eth_getBalance / eth_call to the chain RPC when connected', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue('0x1');
    const rt = runtime({ connected: true });
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
    expect(rt.send).not.toHaveBeenCalled();
    fetchRPC.mockRestore();
  });

  it.each(['eth_accounts', 'eth_chainId', 'net_version'] as const)(
    'returns disconnected defaults for %s',
    async (method) => {
      const rt = runtime();
      const result = await handleEip1193Request(rt, { method });
      if (method === 'eth_accounts') expect(result).toEqual([]);
      if (method === 'eth_chainId') expect(result).toBe('0x1');
      if (method === 'net_version') expect(result).toBe(1);
      expect(rt.send).not.toHaveBeenCalled();
    }
  );

  it.each([
    'personal_sign',
    'eth_sendTransaction',
    'wallet_getCapabilities',
    'wallet_addSubAccount',
    'wallet_getSubAccounts',
    'coinbase_fetchPermissions',
    'eth_getBalance',
  ] as const)('rejects disconnected %s until eth_requestAccounts (4100)', async (method) => {
    await expect(handleEip1193Request(runtime(), { method, params: [] })).rejects.toMatchObject({
      code: standardErrorCodes.provider.unauthorized,
    });
  });
});
