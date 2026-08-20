import type { PopupRuntime } from ':core/channel/types.js';
import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { RequestArguments } from ':core/provider/interface.js';
import { fetchRPCRequest } from ':util/provider.js';
import { handlePaired } from './paired.js';
import { handleUnpaired } from './unpaired.js';

/**
 * Route an EIP-1193 `provider.request` through the popup runtime.
 * `wallet_getCallsStatus` hits Coinbase's wallet RPC. Everything else uses unpaired
 * handling until a session exists, then paired handling (including sub-accounts).
 */
export async function handleEip1193Request(
  runtime: PopupRuntime,
  args: RequestArguments
): Promise<unknown> {
  if (args.method === 'wallet_getCallsStatus') {
    return fetchRPCRequest(args, CB_WALLET_RPC_URL);
  }

  const session = runtime.readSession();
  if (!session) return handleUnpaired(runtime, args);
  return handlePaired(runtime, args, session);
}
