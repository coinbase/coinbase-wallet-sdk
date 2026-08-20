import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import type { Popup } from ':core/popup/index.js';
import { RequestArguments } from ':core/provider/interface.js';
import { store } from ':store/store.js';
import * as providerUtil from ':util/provider.js';
import { BaseAccountProvider } from './BaseAccountProvider.js';

const ACCOUNT = '0x0000000000000000000000000000000000000001';

const mockHandshake = vi.fn();
const mockSend = vi.fn();
const mockCleanup = vi.fn();
const mockFetchRPCRequest = vi.fn();

function mockRuntime(): Popup {
  return {
    helpers: store,
    chainId: () => 1,
    handshake: mockHandshake,
    send: mockSend,
    transport: { kind: 'popup', send: mockSend },
    readSession: () => store.session.get(),
    writeSession: (session) => store.session.set(session),
    cleanup: mockCleanup,
  };
}

function createProvider() {
  return new BaseAccountProvider(
    {
      metadata: { appName: 'Test App', appLogoUrl: null, appChainIds: [1] },
      preference: { telemetry: false },
    },
    mockRuntime()
  );
}

let provider: BaseAccountProvider;

beforeEach(() => {
  vi.resetAllMocks();
  mockHandshake.mockResolvedValue(undefined);
  mockSend.mockResolvedValue({
    accounts: [{ address: ACCOUNT, capabilities: {} }],
  });
  mockCleanup.mockResolvedValue(undefined);

  vi.spyOn(providerUtil, 'fetchRPCRequest').mockImplementation(mockFetchRPCRequest);

  store.session.clear();
  store.account.clear();
  store.subAccounts.clear();
  store.subAccountsConfig.clear();
  store.spendPermissions.clear();

  provider = createProvider();
});

describe('Event handling', () => {
  it('emits disconnect event on user initiated disconnection', async () => {
    const disconnectListener = vi.fn();
    provider.on('disconnect', disconnectListener);

    await provider.disconnect();

    expect(mockCleanup).toHaveBeenCalled();
    expect(disconnectListener).toHaveBeenCalledWith(
      standardErrors.provider.disconnected('User initiated disconnection')
    );
  });

  it('emits chainChanged', () => {
    const chainChangedListener = vi.fn();
    provider.on('chainChanged', chainChangedListener);
    provider.emit('chainChanged', '0x1');
    expect(chainChangedListener).toHaveBeenCalledWith('0x1');
  });

  it('emits accountsChanged', () => {
    const accountsChangedListener = vi.fn();
    provider.on('accountsChanged', accountsChangedListener);
    provider.emit('accountsChanged', ['0x123']);
    expect(accountsChangedListener).toHaveBeenCalledWith(['0x123']);
  });
});

describe('Request Handling', () => {
  it('returns default chain id before pairing', async () => {
    await expect(provider.request({ method: 'eth_chainId' })).resolves.toBe('0x1');
    await expect(provider.request({ method: 'net_version' })).resolves.toBe(1);
  });

  it('throws error when handling invalid request', async () => {
    await expect(provider.request({} as RequestArguments)).rejects.toMatchObject({
      code: standardErrorCodes.rpc.invalidParams,
      message: "'args.method' must be a non-empty string.",
    });
  });

  it('throws error for requests with unsupported or deprecated method', async () => {
    const deprecated = ['eth_sign', 'eth_signTypedData_v2'];
    const unsupported = ['eth_subscribe', 'eth_unsubscribe'];

    for (const method of [...deprecated, ...unsupported]) {
      await expect(provider.request({ method })).rejects.toMatchObject({
        code: standardErrorCodes.provider.unsupportedMethod,
      });
    }
  });
});

describe('Ephemeral methods', () => {
  it('should post requests to wallet rpc url for wallet_getCallsStatus', async () => {
    const args = { method: 'wallet_getCallsStatus' };
    await provider.request(args);
    expect(mockFetchRPCRequest).toHaveBeenCalledWith(args, CB_WALLET_RPC_URL);
  });

  it.each(['wallet_sendCalls', 'wallet_sign'])(
    'handshakes, sends, and cleans up for %s',
    async (method) => {
      mockSend.mockResolvedValueOnce('0xok');
      const args = { method, params: ['0xdeadbeef'] };
      await expect(provider.request(args)).resolves.toBe('0xok');
      expect(mockHandshake).toHaveBeenCalledWith({ method: 'handshake' });
      expect(mockSend).toHaveBeenCalledWith(args);
      expect(mockCleanup).toHaveBeenCalled();
    }
  );
});

describe('ensureSession / pair', () => {
  it('pairs on eth_requestAccounts and returns eip155 accounts', async () => {
    const accounts = await provider.request({ method: 'eth_requestAccounts' });

    expect(mockHandshake).toHaveBeenCalledWith({ method: 'handshake' });
    expect(mockSend).toHaveBeenCalledWith({
      method: 'wallet_connect',
      params: [{ version: '1' }],
    });
    expect(accounts).toEqual([ACCOUNT]);
  });

  it('pairs on wallet_connect and forwards capabilities', async () => {
    const result = await provider.request({
      method: 'wallet_connect',
      params: [
        {
          version: '1',
          capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x1' } },
        },
      ],
    });

    expect(mockHandshake).toHaveBeenCalledWith({ method: 'handshake' });
    expect(mockSend).toHaveBeenCalledWith({
      method: 'wallet_connect',
      params: [
        {
          version: '1',
          capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x1' } },
        },
      ],
    });
    expect(result).toEqual({
      accounts: [{ address: ACCOUNT, capabilities: {} }],
    });
  });

  it('forwards wallet_connect capabilities after pairing', async () => {
    await provider.request({ method: 'eth_requestAccounts' });
    mockSend.mockClear();
    mockSend.mockResolvedValue({
      accounts: [
        {
          address: ACCOUNT,
          capabilities: { signInWithEthereum: { message: 'm', signature: '0x' } },
        },
      ],
    });

    await provider.request({
      method: 'wallet_connect',
      params: [
        {
          version: '1',
          capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x1' } },
        },
      ],
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_connect',
        params: [
          {
            version: '1',
            capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x1' } },
          },
        ],
      })
    );
  });
});

describe('sub-account', () => {
  const SUB = '0x0000000000000000000000000000000000000002';

  it('rejects wallet_addSubAccount before pairing', async () => {
    await expect(
      provider.request({
        method: 'wallet_addSubAccount',
        params: [{ version: '1', account: { type: 'deployed', address: SUB } }],
      })
    ).rejects.toMatchObject({
      message: "Must call 'eth_requestAccounts' before other methods",
    });
  });

  it('adds a sub-account through the popup after pairing', async () => {
    await provider.request({ method: 'eth_requestAccounts' });
    mockSend.mockClear();
    mockSend.mockResolvedValue({ address: SUB });

    const result = await provider.request({
      method: 'wallet_addSubAccount',
      params: [{ version: '1', account: { type: 'deployed', address: SUB } }],
    });

    expect(result).toMatchObject({ address: SUB });
    expect(store.subAccounts.get()?.address).toBe(SUB);
    await expect(provider.request({ method: 'eth_accounts' })).resolves.toEqual([ACCOUNT, SUB]);
  });

  it('returns the cached sub-account from wallet_getSubAccounts', async () => {
    await provider.request({ method: 'eth_requestAccounts' });
    mockSend.mockResolvedValue({ address: SUB });
    await provider.request({
      method: 'wallet_addSubAccount',
      params: [{ version: '1', account: { type: 'deployed', address: SUB } }],
    });
    mockFetchRPCRequest.mockClear();

    await expect(provider.request({ method: 'wallet_getSubAccounts' })).resolves.toEqual({
      subAccounts: [expect.objectContaining({ address: SUB })],
    });
    expect(mockFetchRPCRequest).not.toHaveBeenCalled();
  });
});
