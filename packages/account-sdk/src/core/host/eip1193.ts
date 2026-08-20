import { CB_WALLET_RPC_URL } from ':core/constants.js';
import type { Popup } from ':core/popup/types.js';
import { RequestArguments } from ':core/provider/interface.js';
import { fetchRPCRequest } from ':util/provider.js';
import { handleConnected } from './connected.js';
import { handleDisconnected } from './disconnected.js';

/**
 * Route an EIP-1193 `provider.request` through the popup.
 * `wallet_getCallsStatus` hits Coinbase's wallet RPC. Everything else uses disconnected
 * handling until a session exists, then connected handling (including sub-accounts).
 */
export async function handleEip1193Request(
  runtime: Popup,
  args: RequestArguments
): Promise<unknown> {
  if (args.method === 'wallet_getCallsStatus') {
    return fetchRPCRequest(args, CB_WALLET_RPC_URL);
  }

  const session = runtime.readSession();
  if (!session) return handleDisconnected(runtime, args);
  return handleConnected(runtime, args, session);
}
