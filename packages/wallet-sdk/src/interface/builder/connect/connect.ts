import { standardErrors } from ':core/error/errors.js';
import {
  sessionToWalletConnectResult,
  walletConnectToCaip25Scopes,
} from ':core/namespaces/eip155/walletConnect.js';
import { createSolanaMainnetScopes } from ':core/namespaces/solana/index.js';
import type {
  WalletConnectParams,
  WalletConnectRequest,
  WalletConnectResult,
} from ':core/rpc/wallet_connect.js';
import { createSession } from ':core/session/createSession.js';
import type { WalletTransport } from ':core/transport/index.js';
import { StandardConnect } from '@wallet-standard/features';
import { getInjectedProvider } from '../eip1193/getInjectedProvider.js';
import { isCoinbaseWalletHost } from '../isCoinbaseWalletHost.js';
import { sessionToWalletAccounts } from '../wallet-standard/accounts.js';
import { getRegisteredSolanaWallet } from '../wallet-standard/getRegisteredSolanaWallet.js';
import type { ConnectOptions, ConnectResult } from './types.js';

/** Default to every chain; reject unknown chains and an empty request. */
function parseConnectOptions(options: ConnectOptions = { evm: true, solana: true }): {
  evm?: WalletConnectParams;
  solana: boolean;
} {
  const { evm, solana, ...rest } = options;
  const unsupported = Object.keys(rest);
  if (unsupported.length > 0) {
    throw standardErrors.rpc.invalidParams(
      `Unsupported wallet namespace: ${unsupported.join(', ')}`
    );
  }
  if (!evm && !solana) {
    throw standardErrors.rpc.invalidParams('At least one wallet namespace must be requested');
  }
  // Capabilities pass through untouched; what they mean is between the dapp and the wallet.
  const capabilities = evm && evm !== true ? evm.capabilities : undefined;
  return {
    ...(evm ? { evm: [{ version: '1', ...(capabilities ? { capabilities } : {}) }] } : {}),
    solana: !!solana,
  };
}

/**
 * Connect the requested chains: through the Coinbase Wallet host's own wallets when the page
 * runs inside one, otherwise with one popup approval that covers every chain. The popup is
 * always shown; a stored session is never reused.
 */
export async function connectWallet({
  options,
  transport,
}: {
  options?: ConnectOptions;
  transport: WalletTransport;
}): Promise<ConnectResult> {
  const { evm, solana } = parseConnectOptions(options);

  if (isCoinbaseWalletHost()) {
    let result: ConnectResult = {};
    if (evm) {
      const provider = getInjectedProvider();
      const response = provider
        ? await provider.request({
            method: 'wallet_connect',
            params: evm,
          } satisfies WalletConnectRequest)
        : { accounts: [] };
      // The host's own provider answers `wallet_connect` in the ERC-7846 shape.
      result = { ...result, evm: response as WalletConnectResult };
    }
    if (solana) {
      const wallet = getRegisteredSolanaWallet();
      const output = wallet
        ? await wallet.features[StandardConnect].connect({ silent: true })
        : { accounts: [] };
      result = { ...result, solana: output };
    }
    return result;
  }

  const session = await createSession(transport, {
    ...(evm ? walletConnectToCaip25Scopes(evm) : {}),
    ...(solana ? createSolanaMainnetScopes() : {}),
  });
  const result: ConnectResult = {
    ...(evm ? { evm: sessionToWalletConnectResult(session) } : {}),
    ...(solana ? { solana: { accounts: sessionToWalletAccounts(session) } } : {}),
  };
  if (Object.values(result).every(({ accounts }) => accounts.length === 0)) {
    throw standardErrors.provider.unauthorized('Wallet did not grant any requested namespace');
  }
  return result;
}
