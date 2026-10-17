import { RequestArguments } from ':core/provider/interface.js';
import { activeSession } from ':core/session/grants.js';
import { activeGrantForNamespace } from ':core/session/grants.js';
import { handleConnected } from './connected.js';
import type { Eip1193Context } from './context.js';
import { handleDisconnected } from './disconnected.js';

/**
 * Entry for EIP-1193 `provider.request`.
 *
 * Splits on whether the shared session has an eip155 account:
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
  if (!session || !activeGrantForNamespace(session, 'eip155')) {
    return handleDisconnected(context, args);
  }
  return handleConnected(context, args, session);
}
