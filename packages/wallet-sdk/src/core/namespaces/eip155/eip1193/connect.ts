import { standardErrors } from ':core/error/errors.js';
import type { WalletConnectParams, WalletConnectResult } from ':core/rpc/wallet_connect.js';
import { createSession } from ':core/session/createSession.js';
import type { Session } from ':core/session/types.js';
import { numberToHex } from 'viem';
import { sessionToWalletConnectResult, walletConnectToCaip25Scopes } from '../walletConnect.js';
import type { Eip1193Context } from './context.js';

/**
 * Translate `wallet_connect` into CAIP-25 and map its authoritative grant back to ERC-7846.
 *
 * Always asks the wallet; a stored grant is never reused.
 */
export async function connectEip155(
  context: Eip1193Context,
  params: WalletConnectParams
): Promise<{ session: Session; result: WalletConnectResult }> {
  const { transport, emit, chain } = context;
  const session = await createSession(transport, walletConnectToCaip25Scopes(params));

  const result = sessionToWalletConnectResult(session);
  if (result.accounts.length === 0) {
    throw standardErrors.provider.unauthorized('wallet_createSession granted no eip155 accounts');
  }

  // The grant covers every EVM chain, so the connect event reports the chain the
  // provider is already on rather than one the wallet chose.
  emit(
    'accountsChanged',
    result.accounts.map(({ address }) => address)
  );
  emit('connect', { chainId: numberToHex(chain.get()) });

  return { session, result };
}
