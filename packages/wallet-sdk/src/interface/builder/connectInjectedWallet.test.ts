import { standardErrorCodes } from ':core/error/constants.js';
import type { ProviderInterface } from ':core/provider/interface.js';
import { StandardConnect } from '@wallet-standard/features';
import { connectInjectedWallet } from './connectInjectedWallet.js';
import * as injectedSolanaModule from './solana/getInjectedSolanaWallet.js';

vi.mock('./solana/getInjectedSolanaWallet.js', () => ({
  getInjectedSolanaWallet: vi.fn(),
}));

const EVM_ACCOUNT = '0x0000000000000000000000000000000000000001';
const SOLANA_ACCOUNT = 'So11111111111111111111111111111111111111112';
const getInjectedSolanaWallet = vi.mocked(injectedSolanaModule.getInjectedSolanaWallet);

function injectedProvider(request: ProviderInterface['request']): ProviderInterface {
  return {
    request,
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
  } as unknown as ProviderInterface;
}

beforeEach(() => {
  vi.clearAllMocks();
  getInjectedSolanaWallet.mockReturnValue(null);
});

describe('connectInjectedWallet', () => {
  it('uses wallet_connect and Wallet Standard silent connect for the requested namespaces', async () => {
    const request = vi.fn().mockResolvedValue({
      accounts: [
        {
          address: EVM_ACCOUNT,
          capabilities: { aos: { signature: '0xsignature', isSCW: true } },
        },
      ],
    });
    const connect = vi.fn().mockResolvedValue({
      accounts: [{ address: SOLANA_ACCOUNT }],
    });
    getInjectedSolanaWallet.mockReturnValue({
      name: 'Coinbase Wallet',
      features: {
        [StandardConnect]: {
          version: '1.0.0',
          connect,
        },
      },
    } as never);

    await expect(
      connectInjectedWallet(injectedProvider(request), {
        evm: { capabilities: { aos: { nonce: 'evm-nonce' } } },
        solana: { capabilities: { aos: { nonce: 'solana-nonce' } } },
      })
    ).resolves.toEqual({
      evm: {
        accounts: [
          {
            address: EVM_ACCOUNT,
            capabilities: { aos: { signature: '0xsignature', isSCW: true } },
          },
        ],
      },
      solana: {
        accounts: [
          {
            address: SOLANA_ACCOUNT,
            capabilities: {
              aos: {
                code: standardErrorCodes.provider.unsupportedMethod,
                message: 'Unsupported capability "aos" for solana',
              },
            },
          },
        ],
      },
    });
    expect(request).toHaveBeenCalledWith({
      method: 'wallet_connect',
      params: [{ version: '1', capabilities: { aos: { nonce: 'evm-nonce' } } }],
    });
    expect(connect).toHaveBeenCalledWith({ silent: true });
  });

  it('uses wallet_connect without capabilities for a basic EVM connection', async () => {
    const request = vi.fn().mockResolvedValue({
      accounts: [{ address: EVM_ACCOUNT }],
    });

    await expect(connectInjectedWallet(injectedProvider(request), { evm: true })).resolves.toEqual({
      evm: { accounts: [{ address: EVM_ACCOUNT }] },
    });
    expect(request).toHaveBeenCalledWith({
      method: 'wallet_connect',
      params: [{ version: '1' }],
    });
  });

  it('connects an injected Solana wallet when the host has no EVM provider', async () => {
    const connect = vi.fn().mockResolvedValue({
      accounts: [{ address: SOLANA_ACCOUNT }],
    });
    getInjectedSolanaWallet.mockReturnValue({
      name: 'Coinbase Wallet',
      features: {
        [StandardConnect]: {
          version: '1.0.0',
          connect,
        },
      },
    } as never);

    await expect(connectInjectedWallet(undefined, { solana: true })).resolves.toEqual({
      solana: { accounts: [{ address: SOLANA_ACCOUNT }] },
    });
    expect(connect).toHaveBeenCalledWith({ silent: true });
  });

  it('falls back to eth_accounts only when wallet_connect is unsupported', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce({ code: standardErrorCodes.provider.unsupportedMethod })
      .mockResolvedValueOnce([EVM_ACCOUNT]);

    await expect(
      connectInjectedWallet(injectedProvider(request), {
        evm: { capabilities: { aos: { nonce: 'nonce' } } },
      })
    ).resolves.toEqual({
      evm: {
        accounts: [
          {
            address: EVM_ACCOUNT,
            capabilities: {
              aos: {
                code: standardErrorCodes.provider.unsupportedMethod,
                message: 'Unsupported capability "aos" for evm',
              },
            },
          },
        ],
      },
    });
    expect(request).toHaveBeenNthCalledWith(2, { method: 'eth_accounts' });
  });

  it('propagates wallet_connect rejection without reading eth_accounts', async () => {
    const rejection = { code: standardErrorCodes.provider.userRejectedRequest };
    const request = vi.fn().mockRejectedValue(rejection);

    await expect(connectInjectedWallet(injectedProvider(request), { evm: true })).rejects.toBe(
      rejection
    );
    expect(request).toHaveBeenCalledOnce();
  });

  it('does not forward sub-account capabilities and marks them unsupported per account', async () => {
    const request = vi.fn().mockResolvedValue({
      accounts: [{ address: EVM_ACCOUNT }],
    });

    await expect(
      connectInjectedWallet(injectedProvider(request), {
        evm: {
          capabilities: {
            addSubAccount: true,
            spendPermissions: {},
          },
        },
      })
    ).resolves.toEqual({
      evm: {
        accounts: [
          {
            address: EVM_ACCOUNT,
            capabilities: {
              addSubAccount: {
                code: standardErrorCodes.provider.unsupportedMethod,
                message: 'Unsupported capability "addSubAccount" for evm',
              },
              spendPermissions: {
                code: standardErrorCodes.provider.unsupportedMethod,
                message: 'Unsupported capability "spendPermissions" for evm',
              },
            },
          },
        ],
      },
    });
    expect(request).toHaveBeenCalledWith({
      method: 'wallet_connect',
      params: [{ version: '1' }],
    });
  });

  it('returns requested namespaces with empty accounts when no authorization is available', async () => {
    const request = vi.fn().mockResolvedValue({ accounts: [] });

    await expect(connectInjectedWallet(injectedProvider(request))).resolves.toEqual({
      evm: { accounts: [] },
      solana: { accounts: [] },
    });
  });
});
