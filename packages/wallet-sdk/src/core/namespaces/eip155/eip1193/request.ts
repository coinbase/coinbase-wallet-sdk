import { RequestArguments } from ':core/provider/interface.js';
import { activeSession } from ':core/session/grants.js';
import { projectEthAccounts } from '../session.js';
import { handleConnected } from './connected.js';
import type { Eip1193Context } from './context.js';
import { handleDisconnected } from './disconnected.js';

/**
 * Entry for EIP-1193 `provider.request`.
 *
 * Splits on whether the shared session has an eip155 account, by the same reading the
 * provider uses for its connection state (`projectEthAccounts`):
 * - no eip155 account → `handleDisconnected` (explicit one-shot methods invoke
 *   ephemerally; other wallet-bound requests create a session; status → Coinbase HTTP)
 * - eip155 account → `handleConnected` (`invoke` for wallet methods, chain RPC for
 *   `wallet_getCallsStatus` / `eth_call` / etc.)
 */
export async function handleEip1193Request(
  context: Eip1193Context,
  args: RequestArguments
): Promise<unknown> {
  const session = activeSession(context.transport.readSession());
  if (!session || projectEthAccounts(session).length === 0) {
    return handleDisconnected(context, args);
  }
  return handleConnected(context, args, session);
}
