import { RequestArguments } from ':core/provider/interface.js';
import { activeSession } from ':core/session/activeSession.js';
import { hasNamespaceGrant } from ':core/session/grants.js';
import type { Session } from ':core/session/types.js';
import { handleConnected } from './connected.js';
import type { Eip1193Context } from './context.js';
import { handleDisconnected } from './disconnected.js';

function hasEip155Account(session: Session): boolean {
  // Any eip155 grant counts: a namespace grant and a chain-keyed grant are both
  // connections, and neither implies a particular active chain.
  return hasNamespaceGrant(session, 'eip155');
}

/**
 * Entry for EIP-1193 `provider.request`.
 *
 * Splits on whether the shared session has an eip155 account:
 * - no eip155 scope → `handleDisconnected` (explicit one-shot methods invoke
 *   ephemerally; other wallet-bound requests create a session; status → Coinbase HTTP)
 * - eip155 scope → `handleConnected` (`invoke` for wallet methods, chain RPC for
 *   `wallet_getCallsStatus` / `eth_call` / etc.)
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
