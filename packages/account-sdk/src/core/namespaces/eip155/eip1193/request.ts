import { RequestArguments } from ':core/provider/interface.js';
import { activeSession } from ':core/session/activeSession.js';
import { parseCaip2 } from ':core/session/caip.js';
import type { Session } from ':core/session/types.js';
import { handleConnected } from './connected.js';
import type { Eip1193Context } from './context.js';
import { handleDisconnected } from './disconnected.js';

function hasEip155Account(session: Session): boolean {
  return Object.entries(session.scopes).some(
    ([chainId, scope]) => parseCaip2(chainId)?.namespace === 'eip155' && scope.accounts.length > 0
  );
}

/**
 * Entry for EIP-1193 `provider.request`.
 *
 * Splits on whether the shared session has an eip155 account:
 * - no eip155 scope → `handleDisconnected` (explicit one-shot methods invoke
 *   ephemerally; other wallet-bound requests create a session; status → Coinbase HTTP)
 * - eip155 scope → `handleConnected` (`invoke` for wallet methods, chain RPC for
 *   `wallet_getCallsStatus` / `eth_call` / etc., or local sub-account signing)
 */
export async function handleEip1193Request(
  context: Eip1193Context,
  args: RequestArguments
): Promise<unknown> {
  const session = activeSession(context.transport.readSession());
  if (!session || !hasEip155Account(session)) {
    return handleDisconnected(context, args);
  }
  return handleConnected(context, args, session);
}
