import { standardErrorCodes } from ':core/error/constants.js';
import type { ProviderInterface } from ':core/provider/interface.js';
import { asRecord } from ':util/wire.js';
import { StandardConnect } from '@wallet-standard/features';
import {
  type ConnectAccount,
  type ConnectNamespaceOptions,
  type ConnectOptions,
  type ConnectResult,
  connectAccount,
  forwardedEvmCapabilities,
  parseConnectOptions,
  requestedCapabilities,
} from './connect.js';
import { getInjectedSolanaWallet } from './solana/getInjectedSolanaWallet.js';

function isMethodNotSupported(error: unknown): boolean {
  const code = asRecord(error)?.code;
  return (
    code === standardErrorCodes.provider.unsupportedMethod ||
    code === standardErrorCodes.rpc.methodNotSupported ||
    code === standardErrorCodes.rpc.methodNotFound
  );
}

function parseEthAccounts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((account): account is string => typeof account === 'string');
}

function parseWalletConnectAccounts(
  value: unknown,
  capabilities: Record<string, unknown> | undefined
): ConnectAccount[] {
  const accounts = asRecord(value)?.accounts;
  if (!Array.isArray(accounts)) return [];
  return accounts.flatMap((value) => {
    const account = asRecord(value);
    if (!account || typeof account.address !== 'string') return [];
    return [
      connectAccount(
        'evm',
        account.address,
        capabilities,
        asRecord(account.capabilities) ?? undefined
      ),
    ];
  });
}

async function connectInjectedEvm(
  provider: ProviderInterface,
  selection: ConnectNamespaceOptions
): Promise<ConnectAccount[]> {
  const requested = requestedCapabilities(selection);
  const forwarded = forwardedEvmCapabilities(requested);
  try {
    const response = await provider.request({
      method: 'wallet_connect',
      params: [
        {
          version: '1',
          ...(forwarded ? { capabilities: forwarded } : {}),
        },
      ],
    });
    return parseWalletConnectAccounts(response, requested);
  } catch (error) {
    if (!isMethodNotSupported(error)) throw error;
    const accounts = parseEthAccounts(await provider.request({ method: 'eth_accounts' }));
    return accounts.map((address) => connectAccount('evm', address, requested, undefined));
  }
}

async function connectInjectedSolana(
  selection: ConnectNamespaceOptions
): Promise<ConnectAccount[]> {
  const requested = requestedCapabilities(selection);
  const wallet = getInjectedSolanaWallet();
  if (!wallet) return [];
  const { accounts } = await wallet.features[StandardConnect].connect({ silent: true });
  return accounts.map(({ address }) => connectAccount('solana', address, requested, undefined));
}

/**
 * Passively project Coinbase-hosted injected authorization without creating a popup session.
 */
export async function connectInjectedWallet(
  provider: ProviderInterface | undefined,
  request?: ConnectOptions
): Promise<ConnectResult> {
  const namespaces = parseConnectOptions(request);

  const result: ConnectResult = {};
  if (namespaces.evm !== undefined) {
    result.evm = {
      accounts: provider ? await connectInjectedEvm(provider, namespaces.evm) : [],
    };
  }
  if (namespaces.solana !== undefined) {
    result.solana = { accounts: await connectInjectedSolana(namespaces.solana) };
  }
  return result;
}
