import { RequestArguments } from ':core/provider/interface.js';
import type { WalletRuntime } from ':core/transport/index.js';
import { handleConnected } from './connected.js';
import { handleDisconnected } from './disconnected.js';

/**
 * Entry for EIP-1193 `provider.request`.
 *
 * Splits on whether a `Session` already exists:
 * - no session → `handleDisconnected` (pair on `eth_requestAccounts` /
 *   `wallet_connect`; one-shot handshake+send for `wallet_sendCalls` / `wallet_sign`;
 *   `wallet_getCallsStatus` → Coinbase HTTP)
 * - session → `handleConnected` (`invoke` for wallet methods, chain RPC for
 *   `wallet_getCallsStatus` / `eth_call` / etc., or local sub-account signing)
 */
export async function handleEip1193Request(
  runtime: WalletRuntime,
  args: RequestArguments
): Promise<unknown> {
  const session = runtime.readSession();
  if (!session) return handleDisconnected(runtime, args);
  return handleConnected(runtime, args, session);
}
