import type { WalletTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import { registerWallet } from '@wallet-standard/wallet';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type SolanaWallet, createSolanaWallet } from './createSolanaWallet.js';
import { _resetSolanaWalletRegistration, registerSolanaWallet } from './registerSolanaWallet.js';

vi.mock('@wallet-standard/wallet', () => ({
  registerWallet: vi.fn(),
}));
vi.mock('./createSolanaWallet.js', () => ({
  createSolanaWallet: vi.fn(() => walletFixture()),
}));

const walletTransport = {} as WalletTransport;
const walletSession = {
  get: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
  subscribe: vi.fn(),
} as Store['session'];
type HostWindow = Window & {
  coinbaseWallet?: { environment?: 'inAppBrowser' | 'extension' };
};
const hostWindow = window as HostWindow;
const originalUserAgent = navigator.userAgent;
const originalCoinbaseWallet = hostWindow.coinbaseWallet;

function walletFixture(): SolanaWallet {
  return {
    version: '1.0.0',
    name: 'Coinbase Wallet',
    icon: 'data:image/svg+xml;base64,abc',
    chains: ['solana:mainnet'],
    accounts: [],
    features: {
      'standard:connect': { version: '1.0.0', connect: vi.fn() },
      'standard:disconnect': { version: '1.0.0', disconnect: vi.fn() },
      'standard:events': { version: '1.0.0', on: vi.fn() },
      'solana:signMessage': { version: '1.1.0', signMessage: vi.fn() },
      'solana:signTransaction': {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signTransaction: vi.fn(),
      },
      'solana:signAndSendTransaction': {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signAndSendTransaction: vi.fn(),
      },
      'solana:signAndSendAllTransactions': {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signAndSendAllTransactions: vi.fn(),
      },
    },
  } as SolanaWallet;
}

function setUserAgent(userAgent: string) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent });
}

describe('registerSolanaWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUserAgent('Mozilla/5.0');
    delete hostWindow.coinbaseWallet;
    _resetSolanaWalletRegistration();
  });

  afterAll(() => {
    setUserAgent(originalUserAgent);
    if (originalCoinbaseWallet) {
      hostWindow.coinbaseWallet = originalCoinbaseWallet;
    } else {
      delete hostWindow.coinbaseWallet;
    }
  });

  it.each(['inAppBrowser', 'extension'] as const)(
    'does nothing when the %s environment provides Wallet Standard registration',
    (environment) => {
      hostWindow.coinbaseWallet = { environment };

      expect(
        registerSolanaWallet({ transport: walletTransport, session: walletSession })
      ).toBeUndefined();
      expect(createSolanaWallet).not.toHaveBeenCalled();
      expect(registerWallet).not.toHaveBeenCalled();
    }
  );

  it('supports the immutable InAppBrowser user-agent fallback', () => {
    setUserAgent('Mozilla/5.0 CoinbaseWalletRN/1.2.3 (org.toshi; Android 35)');

    expect(
      registerSolanaWallet({ transport: walletTransport, session: walletSession })
    ).toBeUndefined();
    expect(createSolanaWallet).not.toHaveBeenCalled();
    expect(registerWallet).not.toHaveBeenCalled();
  });

  it('creates and registers one popup wallet outside Coinbase Wallet environments', () => {
    const popupWallet = walletFixture();
    vi.mocked(createSolanaWallet).mockReturnValue(popupWallet);

    expect(
      registerSolanaWallet({ transport: walletTransport, session: walletSession })
    ).toBeUndefined();
    expect(
      registerSolanaWallet({ transport: walletTransport, session: walletSession })
    ).toBeUndefined();

    expect(createSolanaWallet).toHaveBeenCalledOnce();
    expect(registerWallet).toHaveBeenCalledOnce();
    expect(registerWallet).toHaveBeenCalledWith(popupWallet);
  });

  it('routes the page-global wallet through the latest explicit SDK transport', async () => {
    const firstRequest = vi.fn();
    const secondRequest = vi.fn().mockResolvedValue('second');
    const firstTransport = { request: firstRequest } as unknown as WalletTransport;
    const secondTransport = { request: secondRequest } as unknown as WalletTransport;

    registerSolanaWallet({ transport: firstTransport, session: walletSession });
    const registeredTransport = vi.mocked(createSolanaWallet).mock.calls[0]?.[0];
    registerSolanaWallet({ transport: secondTransport, session: walletSession });

    expect(registeredTransport).toBeDefined();
    await expect(registeredTransport!.request({ method: 'test' })).resolves.toBe('second');
    expect(firstRequest).not.toHaveBeenCalled();
    expect(secondRequest).toHaveBeenCalledWith({ method: 'test' });
    expect(createSolanaWallet).toHaveBeenCalledOnce();
    expect(registerWallet).toHaveBeenCalledOnce();
  });

  it('caches before announcing so synchronous listeners cannot create a duplicate', () => {
    const popupWallet = walletFixture();
    vi.mocked(createSolanaWallet).mockReturnValue(popupWallet);
    vi.mocked(registerWallet).mockImplementationOnce(() =>
      registerSolanaWallet({ transport: walletTransport, session: walletSession })
    );

    registerSolanaWallet({ transport: walletTransport, session: walletSession });

    expect(createSolanaWallet).toHaveBeenCalledOnce();
    expect(registerWallet).toHaveBeenCalledOnce();
  });
});
