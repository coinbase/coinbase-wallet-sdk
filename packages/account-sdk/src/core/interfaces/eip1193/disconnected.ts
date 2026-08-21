import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { eip155Caip2 } from ':core/session/caip.js';
import { ensureSession } from ':core/session/ensureSession.js';
import { projectEthAccounts } from ':core/session/index.js';
import { pair } from ':core/session/pair.js';
import type { WalletRuntime } from ':core/transport/index.js';
import { hexStringFromNumber } from ':core/type/util.js';
import { fetchRPCRequest } from ':util/provider.js';
import { switchChainId } from './chainParams.js';

/**
 * EIP-1193 methods before a session exists.
 *
 * Pairing (`eth_requestAccounts` / `wallet_connect`) is the only way to get a
 * session. Other methods either return empty defaults, remember a chain id
 * locally, post `wallet_getCallsStatus` to Coinbase HTTP, or are one-shot
 * (handshake → send → wipe keys) so they never leave a session behind.
 */
export async function handleDisconnected(
  runtime: WalletRuntime,
  args: RequestArguments
): Promise<unknown> {
  switch (args.method) {
    // --- Defaults: nothing is connected yet ---
    case 'eth_accounts':
      return [];
    case 'net_version':
      return 1;
    case 'eth_chainId':
      return hexStringFromNumber(1);
    case 'wallet_switchEthereumChain': {
      runtime.store.account.set({ chain: { id: switchChainId(args.params) } });
      return undefined;
    }
    // Same as old BaseAccountProvider: Coinbase HTTP before a session exists.
    // After pairing, Signer defaulted this to chain.rpcUrl (`handleConnected`).
    case 'wallet_getCallsStatus':
      return fetchRPCRequest(args, CB_WALLET_RPC_URL);

    // --- Pair: handshake + wallet_connect → persist Session ---
    case 'eth_requestAccounts': {
      const { session } = await ensureSession({
        session: undefined,
        requiredScopes: [eip155Caip2(runtime.chainId())],
        pair: () => pair(runtime),
      });
      return projectEthAccounts(session);
    }
    case 'wallet_connect': {
      const { result } = await ensureSession({
        session: undefined,
        requiredScopes: [eip155Caip2(runtime.chainId())],
        pair: () => pair(runtime, args),
      });
      return result;
    }

    // --- CAIP-27 requires a session (4100). Pair first. ---
    case 'wallet_invokeMethod':
      throw standardErrors.provider.unauthorized(
        'wallet_invokeMethod requires a session. Call eth_requestAccounts first.'
      );

    // --- One-shot: do not leave a session (ephemeral sign / sendCalls) ---
    case 'wallet_sendCalls':
    case 'wallet_sign': {
      try {
        await runtime.handshake({ method: 'handshake' });
        return runtime.send(args);
      } finally {
        await runtime.cleanup();
      }
    }
    default:
      throw standardErrors.provider.unauthorized(
        "Must call 'eth_requestAccounts' before other methods"
      );
  }
}
