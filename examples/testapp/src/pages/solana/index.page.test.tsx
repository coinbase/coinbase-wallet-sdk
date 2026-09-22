import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { WalletAccount } from '@wallet-standard/base';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEIP1193Provider } from '../../context/EIP1193ProviderContextProvider';
import SolanaPlayground from './index.page';

vi.mock('../../context/EIP1193ProviderContextProvider', () => ({
  useEIP1193Provider: vi.fn(),
}));
vi.mock('@wallet-standard/app', () => ({
  getWallets: () => ({ get: () => [wallet] }),
}));

const account: WalletAccount = {
  address: '11111111111111111111111111111111',
  publicKey: new Uint8Array(32),
  chains: ['solana:mainnet'],
  features: [
    'solana:signMessage',
    'solana:signTransaction',
    'solana:signAndSendTransaction',
    'solana:signAndSendAllTransactions',
  ],
};
const standardConnect = vi.fn(async () => ({ accounts: [account] }));
const standardSignMessage = vi.fn(async () => [
  { signature: new Uint8Array(64).fill(1), signedMessage: new Uint8Array([1]) },
]);
const standardSignTransaction = vi.fn(async () => [{ signedTransaction: new Uint8Array([9]) }]);
const standardSignAndSendTransaction = vi.fn(async () => [
  { signature: new Uint8Array(64).fill(2) },
]);
const standardSignAndSendAllTransactions = vi.fn(async () => [
  { status: 'fulfilled' as const, value: { signature: new Uint8Array(64).fill(3) } },
]);
const wallet = {
  version: '1.0.0',
  name: 'Coinbase Wallet',
  icon: 'data:image/svg+xml;base64,abc',
  chains: ['solana:mainnet'],
  accounts: [account],
  features: {
    'standard:connect': { version: '1.0.0', connect: standardConnect },
    'standard:events': { version: '1.0.0', on: vi.fn() },
    'solana:signMessage': { version: '1.1.0', signMessage: standardSignMessage },
    'solana:signTransaction': {
      version: '1.0.0',
      supportedTransactionVersions: ['legacy', 0],
      signTransaction: standardSignTransaction,
    },
    'solana:signAndSendTransaction': {
      version: '1.0.0',
      supportedTransactionVersions: ['legacy', 0],
      signAndSendTransaction: standardSignAndSendTransaction,
    },
    'solana:signAndSendAllTransactions': {
      version: '1.0.0',
      supportedTransactionVersions: ['legacy', 0],
      signAndSendAllTransactions: standardSignAndSendAllTransactions,
    },
  },
};
const registerSolanaWallet = vi.fn();
const sdkConnect = vi.fn();

describe('SolanaPlayground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdkConnect.mockResolvedValue({
      evm: {
        accounts: [{ address: '0x0000000000000000000000000000000000000001' }],
      },
      solana: {
        accounts: [{ address: account.address }],
      },
    });
    vi.mocked(useEIP1193Provider).mockReturnValue({
      sdk: { connect: sdkConnect, registerSolanaWallet },
    } as never);
  });

  it('connects the default EVM and Solana namespaces through sdk.connect', async () => {
    render(<SolanaPlayground />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit sdk.connect()' }));

    await waitFor(() => expect(sdkConnect).toHaveBeenCalledWith());
    expect(screen.getByText(/"evm":/)).toBeTruthy();
    expect(screen.getByText(/"solana":/)).toBeTruthy();
  });

  it('requests and renders independent per-account EVM and Solana AOS results', async () => {
    sdkConnect.mockResolvedValueOnce({
      evm: {
        accounts: [
          {
            address: '0x0000000000000000000000000000000000000001',
            capabilities: { aos: { signature: '0xevm-signature', isSCW: true } },
          },
        ],
      },
      solana: {
        accounts: [
          {
            address: account.address,
            capabilities: { aos: { signature: 'solana-base58-signature' } },
          },
        ],
      },
    });
    render(<SolanaPlayground />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit sdk.connect({ aos })' }));

    await waitFor(() => expect(sdkConnect).toHaveBeenCalledOnce());
    const request = sdkConnect.mock.calls[0]?.[0];
    expect(request.evm.capabilities.aos.apiUrl).toBe('https://api.wallet.coinbase.com');
    expect(request.solana.capabilities.aos.apiUrl).toBe('https://api.wallet.coinbase.com');
    expect(request.evm.capabilities.aos.nonce).not.toBe(request.solana.capabilities.aos.nonce);
    expect(screen.getByText(/0xevm-signature/)).toBeTruthy();
    expect(screen.getByText(/solana-base58-signature/)).toBeTruthy();
  });

  it('renders a mixed partial sdk.connect result as a success', async () => {
    sdkConnect.mockResolvedValueOnce({
      evm: {
        accounts: [{ address: '0x0000000000000000000000000000000000000001' }],
      },
      solana: { accounts: [] },
    });
    render(<SolanaPlayground />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit sdk.connect()' }));

    await waitFor(() => expect(screen.getByText('success')).toBeTruthy());
    expect(screen.getByText(/"solana": \{\s+"accounts": \[\]/)).toBeTruthy();
  });

  it('unlocks signing actions when sdk.connect returns a Solana account', async () => {
    render(<SolanaPlayground />);
    const signMessageButton = screen.getByRole('button', {
      name: 'Submit solana:signMessage',
    });
    expect((signMessageButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Submit sdk.connect()' }));

    await waitFor(() => expect((signMessageButton as HTMLButtonElement).disabled).toBe(false));
  });

  it('explicitly registers and connects through Wallet Standard', async () => {
    render(<SolanaPlayground />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit standard:connect' }));

    await waitFor(() => expect(standardConnect).toHaveBeenCalledOnce());
    expect(registerSolanaWallet).toHaveBeenCalledOnce();
    expect(screen.getByText(/address/)).toBeTruthy();
  });

  it('signs messages through Wallet Standard', async () => {
    render(<SolanaPlayground />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit standard:connect' }));
    await waitFor(() => expect(standardConnect).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole('button', { name: 'Submit solana:signMessage' }));

    await waitFor(() => expect(standardSignMessage).toHaveBeenCalledOnce());
    expect(screen.getByText(/"signature":/)).toBeTruthy();
  });

  it('signs Kit-built transaction bytes through Wallet Standard', async () => {
    render(<SolanaPlayground />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit standard:connect' }));
    await waitFor(() => expect(standardConnect).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole('button', { name: 'Submit solana:signTransaction' }));

    await waitFor(() => expect(standardSignTransaction).toHaveBeenCalledOnce());
    expect(screen.getByText(/signedTransaction/)).toBeTruthy();
  });

  it('signs and sends single and batch transactions through Wallet Standard', async () => {
    render(<SolanaPlayground />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit standard:connect' }));
    await waitFor(() => expect(standardConnect).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole('button', { name: 'Submit solana:signAndSendTransaction' }));
    await waitFor(() => expect(standardSignAndSendTransaction).toHaveBeenCalledOnce());

    fireEvent.click(
      screen.getByRole('button', { name: 'Submit solana:signAndSendAllTransactions' })
    );
    await waitFor(() => expect(standardSignAndSendAllTransactions).toHaveBeenCalledOnce());
    expect(standardSignAndSendAllTransactions).toHaveBeenCalledWith(expect.any(Array), {
      mode: 'serial',
    });
    expect(screen.getByText(/fulfilled/)).toBeTruthy();
  });
});
