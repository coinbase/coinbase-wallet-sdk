import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { RequestArguments } from ':core/provider/interface.js';
import type { WalletRuntime } from ':core/transport/index.js';
import { fetchRPCRequest } from ':util/provider.js';
import { handleConnected } from './connected.js';
import { handleDisconnected } from './disconnected.js';

/**
 * Entry for EIP-1193 `provider.request`.
 *
 * Splits on whether a `Session` already exists:
 * - no session → `handleDisconnected` (pair on `eth_requestAccounts` /
 *   `wallet_connect`; one-shot handshake+send for `wallet_sendCalls` / `wallet_sign`)
 * - session → `handleConnected` (`invoke` for wallet methods, or local
 *   sub-account signing)
 *
 * `wallet_getCallsStatus` is Coinbase HTTP, not the wallet transport.
 */
export async function handleEip1193Request(
  runtime: WalletRuntime,
  args: RequestArguments
): Promise<unknown> {
  if (args.method === 'wallet_getCallsStatus') {
    return fetchRPCRequest(args, CB_WALLET_RPC_URL);
  }

  const session = runtime.readSession();
  if (!session) return handleDisconnected(runtime, args);
  return handleConnected(runtime, args, session);
}
