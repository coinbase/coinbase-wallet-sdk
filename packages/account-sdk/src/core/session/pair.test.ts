import type { Popup } from ':core/popup/types.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { ToOwnerAccountFn } from ':store/store.js';
import { projectEthAccounts } from './eip155.js';
import { ingestConnectResult, pair, walletConnectParams } from './pair.js';

const ADDRESS = '0x0000000000000000000000000000000000000001';
const SUB = '0x0000000000000000000000000000000000000002';
const OWNER = '0x00000000000000000000000000000000000000aa';

function runtime(
  send: Popup['send'],
  opts?: {
    defaultAccount?: 'sub' | 'universal';
    creation?: 'on-connect' | 'manual';
    toOwnerAccount?: ToOwnerAccountFn;
  }
): Popup {
  const sessionStore: { current?: Parameters<Popup['writeSession']>[0] } = {};
  let accounts: `0x${string}`[] = [];
  let subAccount: { address: `0x${string}` } | undefined;
  let subAccountsConfig = {
    defaultAccount: opts?.defaultAccount,
    creation: opts?.creation,
    toOwnerAccount: opts?.toOwnerAccount,
    capabilities: undefined as Record<string, unknown> | undefined,
  };
  return {
    helpers: {
      account: {
        get: () => ({ accounts }),
        set: vi.fn((value: { accounts?: `0x${string}`[] }) => {
          if (value.accounts) accounts = value.accounts;
        }),
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
    } as unknown as Popup['helpers'],
    chainId: () => 1,
    handshake: vi.fn().mockResolvedValue(undefined),
    send,
    transport: { kind: 'popup', send },
    readSession: () => sessionStore.current,
    writeSession: (session) => {
      sessionStore.current = session;
    },
    cleanup: vi.fn(),
  };
}

describe('walletConnectParams', () => {
  it('defaults to version 1 with no capabilities', () => {
    expect(walletConnectParams()).toEqual([{ version: '1' }]);
    expect(walletConnectParams({ method: 'wallet_connect' })).toEqual([{ version: '1' }]);
  });

  it('forwards dapp capabilities including addSubAccount, overlaying injected caps', () => {
    const request: RequestArguments = {
      method: 'wallet_connect',
      params: [
        {
          version: '1',
          capabilities: {
            signInWithEthereum: { nonce: 'abc', chainId: '0x1' },
            addSubAccount: { account: { type: 'create' } },
            extra: { foo: 1 },
          },
        },
      ],
    };
    expect(walletConnectParams(request, { spendPermissions: { 8453: [] } })).toEqual([
      {
        version: '1',
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
  it('sends the dapp wallet_connect params after handshake', async () => {
    const send = vi.fn().mockResolvedValue({
      accounts: [{ address: ADDRESS, capabilities: { signInWithEthereum: { message: 'm' } } }],
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
      method: 'wallet_connect',
      params: [
        {
          version: '1',
          capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x1' } },
        },
      ],
    });
    expect(result).toMatchObject({
      accounts: [{ address: ADDRESS }],
    });
  });

  it('injects addSubAccount when creation is on-connect', async () => {
    const send = vi.fn().mockResolvedValue({
      accounts: [{ address: ADDRESS }],
    });
    const rt = runtime(send, {
      creation: 'on-connect',
      toOwnerAccount: (async () => ({
        account: { type: 'local', address: OWNER },
      })) as unknown as ToOwnerAccountFn,
    });

    await pair(rt);

    expect(send).toHaveBeenCalledWith({
      method: 'wallet_connect',
      params: [
        {
          version: '1',
          capabilities: {
            addSubAccount: {
              account: {
                type: 'create',
                keys: [{ type: 'address', publicKey: OWNER }],
              },
            },
          },
        },
      ],
    });
  });
});

describe('ingestConnectResult', () => {
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
    expect(rt.helpers.subAccounts.set).toHaveBeenCalledWith(
      expect.objectContaining({ address: SUB })
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
