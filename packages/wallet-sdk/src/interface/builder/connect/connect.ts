import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import type { Caip25RequestScope } from ':core/rpc/wallet_createSession.js';
import { createSession } from ':core/session/createSession.js';
import { activeSession } from ':core/session/grants.js';
import type { WalletTransport } from ':core/transport/index.js';
import { isCoinbaseWalletHost } from '../isCoinbaseWalletHost.js';
import { createEvmConnector } from './evm.js';
import { createSolanaConnector } from './solana.js';
import type { ChainConnector, ConnectOptions, ConnectResult } from './types.js';

/** Default to every chain; reject unknown chains and an empty request. */
function parseConnectOptions(
  options: ConnectOptions = { evm: true, solana: true }
): ChainConnector[] {
  const { evm, solana, ...rest } = options;
  const unsupported = Object.keys(rest);
  if (unsupported.length > 0) {
    throw standardErrors.rpc.invalidParams(
      `Unsupported wallet namespace: ${unsupported.join(', ')}`
    );
  }
  const connectors = [
    ...(evm ? [createEvmConnector(evm)] : []),
    ...(solana ? [createSolanaConnector()] : []),
  ];
  if (connectors.length === 0) {
    throw standardErrors.rpc.invalidParams('At least one wallet namespace must be requested');
  }
  return connectors;
}

/**
 * Connect the requested chains: through the Coinbase Wallet host's own wallet when the page
 * runs inside one, otherwise with one popup approval that covers every chain.
 */
export async function connectWallet({
  options,
  transport,
}: {
  options?: ConnectOptions;
  transport: WalletTransport;
}): Promise<ConnectResult> {
  const chains = parseConnectOptions(options);
  let result: ConnectResult = {};

  if (isCoinbaseWalletHost()) {
    for (const chain of chains) {
      result = { ...result, ...(await chain.connectHost()) };
    }
    return result;
  }

  let session = activeSession(transport.readSession());
  if (!session || chains.some((chain) => chain.needsPopup(session))) {
    let scopes: Record<string, Caip25RequestScope> = {};
    for (const chain of chains) {
      scopes = { ...scopes, ...chain.scopes };
    }
    try {
      session = await createSession(transport, scopes);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === standardErrorCodes.provider.unauthorized
      ) {
        await transport.cleanup();
      }
      throw error;
    }
  }

  for (const chain of chains) {
    result = { ...result, ...(await chain.readResult(session)) };
  }

  if (Object.values(result).every(({ accounts }) => accounts.length === 0)) {
    throw standardErrors.provider.unauthorized('Wallet did not grant any requested namespace');
  }

  return result;
}
