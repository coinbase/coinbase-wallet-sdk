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
import { createSolanaWallet, isCompatibleSolanaWallet } from './createSolanaWallet.js';

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
const cleanup = vi.fn(async () => notifySessionChange?.(undefined, undefined));

function transport(restored?: Session): WalletTransport {
  return {
    readSession: () => restored,
    cleanup,
  } as unknown as WalletTransport;
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
    expect(isCompatibleSolanaWallet(wallet)).toBe(true);
  });

  it('restores every granted account and tracks session changes', () => {
    const wallet = createSolanaWallet(
      transport({
        sessionId: 'session',
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

  it('connects and disconnects through the transport interface', async () => {
    const wallet = createSolanaWallet(transport(), sessionStore());
    const features = wallet.features as Features;
    const changed = vi.fn();
    features['standard:events'].on('change', changed);
    mockHandleSolanaRequest.mockResolvedValueOnce([address]).mockResolvedValueOnce(undefined);

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
    mockHandleSolanaRequest
      .mockResolvedValueOnce([address])
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
    mockHandleSolanaRequest
      .mockResolvedValueOnce([address])
      .mockResolvedValueOnce({ signature })
      .mockResolvedValueOnce(batchResult);
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
    mockHandleSolanaRequest.mockResolvedValueOnce([address]);
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

  it('clears stale transport authorization after a 4100 response', async () => {
    const wallet = createSolanaWallet(transport(), sessionStore());
    const features = wallet.features as Features;
    mockHandleSolanaRequest
      .mockResolvedValueOnce([address])
      .mockRejectedValueOnce({ code: 4100, message: 'Stale session' });
    await features['standard:connect'].connect();

    await expect(
      features['solana:signMessage'].signMessage({
        account: wallet.accounts[0],
        message: new Uint8Array([1]),
      })
    ).rejects.toMatchObject({ code: 4100 });

    expect(cleanup).toHaveBeenCalledOnce();
    expect(wallet.accounts).toEqual([]);
  });
});
