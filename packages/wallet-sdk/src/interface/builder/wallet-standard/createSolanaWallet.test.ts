import { handleSolanaRequest } from ':core/namespaces/solana/index.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { Session } from ':core/session/types.js';
import type { Store } from ':store/store.js';
import type {
  SolanaSignAndSendAllTransactionsFeature,
  SolanaSignAndSendTransactionFeature,
  SolanaSignMessageFeature,
  SolanaSignTransactionFeature,
} from '@solana/wallet-standard-features';
import type {
  StandardConnectFeature,
  StandardDisconnectFeature,
  StandardEventsFeature,
} from '@wallet-standard/features';
import * as Base58 from 'ox/Base58';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSolanaWallet } from './createSolanaWallet.js';
import type { SolanaWallet } from './features.js';

type Features = StandardConnectFeature &
  StandardDisconnectFeature &
  StandardEventsFeature &
  SolanaSignMessageFeature &
  SolanaSignTransactionFeature &
  SolanaSignAndSendTransactionFeature &
  SolanaSignAndSendAllTransactionsFeature;

vi.mock(':core/namespaces/solana/index.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import(':core/namespaces/solana/index.js')>()),
  handleSolanaRequest: vi.fn(),
}));

const mockHandleSolanaRequest = handleSolanaRequest as unknown as ReturnType<typeof vi.fn>;
const address = 'So11111111111111111111111111111111111111112';
const otherAddress = Base58.fromBytes(new Uint8Array(32).fill(7));
let notifySessionChange:
  | ((session: Session | undefined, previousSession: Session | undefined) => void)
  | undefined;
let transportSession: Session | undefined;
const cleanup = vi.fn(async () => {
  transportSession = undefined;
  notifySessionChange?.(undefined, undefined);
});

function transport(restored?: Session): WalletTransport {
  transportSession = restored;
  return {
    readSession: () => transportSession,
    cleanup,
  } as unknown as WalletTransport;
}

function solanaSession(methods: string[]): Session {
  return { namespaces: { solana: { accounts: [address], methods } } };
}

/** Stand-in for a connect that pairs: the new session is written before connect resolves. */
function mockConnect(methods: string[] = ['solana_signMessage']) {
  mockHandleSolanaRequest.mockImplementationOnce(async () => {
    transportSession = solanaSession(methods);
    return [address];
  });
}

function preparedCalls(wallet: SolanaWallet) {
  const feature = wallet.features['coinbase:signPreparedCalls'];
  if (!feature) throw new Error('coinbase:signPreparedCalls is not listed');
  return feature;
}

function sessionStore(): Store['session'] {
  return {
    get: () => undefined,
    set: vi.fn(),
    clear: vi.fn(),
    subscribe: (listener) => {
      notifySessionChange = listener;
      return vi.fn();
    },
  };
}

describe('createSolanaWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifySessionChange = undefined;
  });

  it('exposes the required mainnet Wallet Standard contract', () => {
    const wallet = createSolanaWallet(transport(), sessionStore());

    expect(wallet.name).toBe('Coinbase Wallet');
    expect(wallet.icon).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(wallet.chains).toEqual(['solana:mainnet']);
    expect(Object.keys(wallet.features).sort()).toEqual(
      [
        'standard:connect',
        'standard:disconnect',
        'standard:events',
        'solana:signAndSendAllTransactions',
        'solana:signAndSendTransaction',
        'solana:signMessage',
        'solana:signTransaction',
      ].sort()
    );
  });

  it('restores every granted account and tracks session changes', () => {
    const wallet = createSolanaWallet(
      transport({
        namespaces: {
          solana: {
            accounts: [address, otherAddress],
            methods: ['solana_signMessage'],
          },
        },
      }),
      sessionStore()
    );
    const changed = vi.fn();
    wallet.features['standard:events'].on('change', changed);

    expect(wallet.accounts.map((account) => account.address)).toEqual([address, otherAddress]);
    notifySessionChange?.(undefined, undefined);
    expect(wallet.accounts).toEqual([]);
    expect(changed).toHaveBeenCalledWith({ accounts: [] });
  });

  it('returns no accounts without prompting for an unknown silent session', async () => {
    const wallet = createSolanaWallet(transport(), sessionStore());
    const features = wallet.features as Features;

    await expect(features['standard:connect'].connect({ silent: true })).resolves.toEqual({
      accounts: [],
    });
    expect(handleSolanaRequest).not.toHaveBeenCalled();
  });

  it('returns restored accounts on a silent connect without checking or pairing', async () => {
    const wallet = createSolanaWallet(
      transport({
        namespaces: { solana: { accounts: [address], methods: ['solana_signMessage'] } },
      }),
      sessionStore()
    );
    const features = wallet.features as Features;

    await expect(features['standard:connect'].connect({ silent: true })).resolves.toMatchObject({
      accounts: [{ address }],
    });
    expect(handleSolanaRequest).not.toHaveBeenCalled();
  });

  it('connects and disconnects through the transport interface', async () => {
    const wallet = createSolanaWallet(transport(), sessionStore());
    const features = wallet.features as Features;
    const changed = vi.fn();
    features['standard:events'].on('change', changed);
    mockConnect();
    mockHandleSolanaRequest.mockResolvedValueOnce(undefined);

    await expect(features['standard:connect'].connect()).resolves.toMatchObject({
      accounts: [{ address }],
    });
    await features['standard:disconnect'].disconnect();

    expect(changed).toHaveBeenNthCalledWith(1, {
      accounts: [expect.objectContaining({ address })],
    });
    expect(changed).toHaveBeenNthCalledWith(2, { accounts: [] });
  });

  it('signs messages and transactions using native Wallet Standard bytes', async () => {
    const wallet = createSolanaWallet(transport(), sessionStore());
    const features = wallet.features as Features;
    const signature = new Uint8Array(64).fill(1);
    const signedTransaction = new Uint8Array([9, 10]);
    mockConnect();
    mockHandleSolanaRequest
      .mockResolvedValueOnce({ signature })
      .mockResolvedValueOnce({ signedTransaction });
    await features['standard:connect'].connect();
    const account = wallet.accounts[0];
    const message = new Uint8Array([1, 2]);
    const transaction = new Uint8Array([3, 4]);

    await expect(features['solana:signMessage'].signMessage({ account, message })).resolves.toEqual(
      [{ signature, signedMessage: message }]
    );
    await expect(
      features['solana:signTransaction'].signTransaction({
        account,
        transaction,
        chain: 'solana:mainnet',
        options: { minContextSlot: 10 },
      })
    ).resolves.toEqual([{ signedTransaction }]);
    expect(handleSolanaRequest).toHaveBeenNthCalledWith(2, expect.anything(), {
      method: 'solana_signMessage',
      params: { pubkey: address, message },
    });
    expect(handleSolanaRequest).toHaveBeenNthCalledWith(3, expect.anything(), {
      method: 'solana_signTransaction',
      params: { pubkey: address, transaction, options: { minContextSlot: 10 } },
    });
  });

  it('signs and sends single and batch transactions', async () => {
    const wallet = createSolanaWallet(transport(), sessionStore());
    const features = wallet.features as Features;
    const signature = new Uint8Array(64).fill(2);
    const batchResult = [
      { status: 'fulfilled' as const, value: { signature } },
      { status: 'rejected' as const, reason: { code: 4001, message: 'rejected' } },
    ];
    mockConnect();
    mockHandleSolanaRequest.mockResolvedValueOnce({ signature }).mockResolvedValueOnce(batchResult);
    await features['standard:connect'].connect();
    const account = wallet.accounts[0];
    const first = new Uint8Array([1]);
    const second = new Uint8Array([2]);

    await expect(
      features['solana:signAndSendTransaction'].signAndSendTransaction({
        account,
        transaction: first,
        chain: 'solana:mainnet',
        options: { skipPreflight: true },
      })
    ).resolves.toEqual([{ signature }]);
    await expect(
      features['solana:signAndSendAllTransactions'].signAndSendAllTransactions(
        [
          { account, transaction: first, chain: 'solana:mainnet' },
          { account, transaction: second, chain: 'solana:mainnet' },
        ],
        { mode: 'serial' }
      )
    ).resolves.toEqual(batchResult);

    expect(handleSolanaRequest).toHaveBeenNthCalledWith(2, expect.anything(), {
      method: 'solana_signAndSendTransaction',
      params: {
        pubkey: address,
        transaction: first,
        options: { skipPreflight: true },
      },
    });
    expect(handleSolanaRequest).toHaveBeenNthCalledWith(3, expect.anything(), {
      method: 'solana_signAndSendAllTransactions',
      params: {
        inputs: [
          { pubkey: address, transaction: first },
          { pubkey: address, transaction: second },
        ],
        options: { mode: 'serial' },
      },
    });
  });

  it('rejects unknown accounts and chains', async () => {
    const wallet = createSolanaWallet(transport(), sessionStore());
    const features = wallet.features as Features;
    mockConnect();
    await features['standard:connect'].connect();

    await expect(
      features['solana:signMessage'].signMessage({
        account: { ...wallet.accounts[0], address: 'other' },
        message: new Uint8Array([1]),
      })
    ).rejects.toMatchObject({ code: 4100 });
    await expect(
      features['solana:signTransaction'].signTransaction({
        account: wallet.accounts[0],
        transaction: new Uint8Array([1]),
        chain: 'solana:devnet',
      })
    ).rejects.toMatchObject({ code: 4902 });
    await expect(
      features['solana:signAndSendTransaction'].signAndSendTransaction({
        account: wallet.accounts[0],
        transaction: new Uint8Array([1]),
        chain: 'solana:devnet',
      })
    ).rejects.toMatchObject({ code: 4902 });
    await expect(
      features['solana:signAndSendAllTransactions'].signAndSendAllTransactions([
        {
          account: { ...wallet.accounts[0], address: 'other' },
          transaction: new Uint8Array([1]),
          chain: 'solana:mainnet',
        },
      ])
    ).rejects.toMatchObject({ code: 4100 });
    await expect(
      features['solana:signAndSendAllTransactions'].signAndSendAllTransactions([])
    ).rejects.toMatchObject({ code: -32602 });
  });

  it('passes a 4100 through and leaves clearing the session to core', async () => {
    const wallet = createSolanaWallet(transport(), sessionStore());
    const features = wallet.features as Features;
    mockConnect();
    mockHandleSolanaRequest.mockRejectedValueOnce({ code: 4100, message: 'Stale session' });
    await features['standard:connect'].connect();

    await expect(
      features['solana:signMessage'].signMessage({
        account: wallet.accounts[0],
        message: new Uint8Array([1]),
      })
    ).rejects.toMatchObject({ code: 4100 });

    // Core's `invoke` clears the session; the wallet's accounts follow the session store.
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('logs each wallet call as a request on the solana surface', async () => {
    const logEvent = vi.fn();
    window.ClientAnalytics = { logEvent } as unknown as typeof window.ClientAnalytics;
    const wallet = createSolanaWallet(transport(), sessionStore());
    const features = wallet.features as Features;
    mockConnect();
    mockHandleSolanaRequest.mockRejectedValueOnce({ code: 4001, message: 'User rejected' });
    await features['standard:connect'].connect();

    await expect(
      features['solana:signMessage'].signMessage({
        account: wallet.accounts[0],
        message: new Uint8Array([1]),
      })
    ).rejects.toMatchObject({ code: 4001 });

    expect(logEvent).toHaveBeenCalledWith(
      'provider.request.responded',
      expect.objectContaining({ surface: 'solana', method: 'connect' }),
      'high'
    );
    expect(logEvent).toHaveBeenCalledWith(
      'provider.request.error',
      expect.objectContaining({ surface: 'solana', method: 'solana_signMessage', errorCode: 4001 }),
      'high'
    );
    window.ClientAnalytics = undefined;
  });

  describe('coinbase:signPreparedCalls', () => {
    it('is listed only while the session grants coinbase_signPreparedCalls', () => {
      const wallet = createSolanaWallet(transport(), sessionStore());
      const changed = vi.fn();
      wallet.features['standard:events'].on('change', changed);

      notifySessionChange?.(solanaSession(['solana_signMessage']), undefined);
      expect(wallet.features).not.toHaveProperty(['coinbase:signPreparedCalls']);
      expect(wallet.accounts[0].features).not.toContain('coinbase:signPreparedCalls');
      expect(changed).toHaveBeenLastCalledWith({ accounts: wallet.accounts });

      notifySessionChange?.(solanaSession(['coinbase_signPreparedCalls']), undefined);
      expect(wallet.features).toHaveProperty(['coinbase:signPreparedCalls']);
      expect(wallet.accounts[0].features).toContain('coinbase:signPreparedCalls');
      expect(changed).toHaveBeenLastCalledWith({
        accounts: wallet.accounts,
        features: wallet.features,
      });

      notifySessionChange?.(undefined, undefined);
      expect(wallet.features).not.toHaveProperty(['coinbase:signPreparedCalls']);
      expect(changed).toHaveBeenLastCalledWith({ accounts: [], features: wallet.features });
    });

    it('is listed for a restored session that grants it', () => {
      const wallet = createSolanaWallet(
        transport(solanaSession(['coinbase_signPreparedCalls'])),
        sessionStore()
      );

      expect(wallet.features).toHaveProperty(['coinbase:signPreparedCalls']);
    });

    it('is listed once connect returns a session that grants it', async () => {
      const wallet = createSolanaWallet(transport(), sessionStore());
      mockConnect(['coinbase_signPreparedCalls']);

      await (wallet.features as Features)['standard:connect'].connect();

      expect(wallet.features).toHaveProperty(['coinbase:signPreparedCalls']);
    });

    it('signs as the connected account and passes every other field through', async () => {
      const wallet = createSolanaWallet(
        transport(solanaSession(['coinbase_signPreparedCalls'])),
        sessionStore()
      );
      const walletResult = { opaque: 'result' };
      mockHandleSolanaRequest.mockResolvedValueOnce(walletResult);

      await expect(
        preparedCalls(wallet).signPreparedCalls({
          account: wallet.accounts[0],
          opaque: 'params',
          pubkey: otherAddress,
        })
      ).resolves.toBe(walletResult);
      expect(handleSolanaRequest).toHaveBeenCalledWith(expect.anything(), {
        method: 'coinbase_signPreparedCalls',
        params: [{ opaque: 'params', pubkey: address }],
      });
    });

    it('rejects an account the session did not authorize', async () => {
      const wallet = createSolanaWallet(
        transport(solanaSession(['coinbase_signPreparedCalls'])),
        sessionStore()
      );

      await expect(
        preparedCalls(wallet).signPreparedCalls({
          account: { ...wallet.accounts[0], address: otherAddress },
        })
      ).rejects.toMatchObject({ code: 4100 });
      expect(handleSolanaRequest).not.toHaveBeenCalled();
    });
  });
});
