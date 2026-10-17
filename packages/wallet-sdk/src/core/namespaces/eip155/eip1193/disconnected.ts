import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { WALLET_INVOKE_METHOD } from ':core/session/caip27.js';
import { eip155Translator, toEnvelope } from '../envelope.js';
import { projectEthAccounts } from '../session.js';
import { invokeEphemeral } from ':core/session/invoke.js';
import { hexStringFromNumber } from ':core/type/util.js';
import { fetchRPCRequest } from ':util/provider.js';
import { parseSwitchChainId } from './params.js';
import { connectEip155 } from './connect.js';
import type { Eip1193Context } from './context.js';
import { parseCaip27 } from './parseCaip27.js';

/**
 * Everything the disconnected path can serve without creating a session.
 *
 * The switch below answers the first group locally and the second over Coinbase HTTP;
 * the wallet-bound rest handshake, invoke one CAIP-27 envelope, and clean up. `pay()`
 * restricts its one-shot provider to exactly this set, which is what keeps it from
 * ever connecting.
 */
export const EPHEMERAL_METHODS = new Set([
  // Local: answered from the active chain, with no wallet round trip.
  'eth_accounts',
  'net_version',
  'eth_chainId',
  'wallet_switchEthereumChain',
  // Unsigned chain JSON-RPC over Coinbase HTTP.
  'wallet_getCallsStatus',
  // Wallet-bound: handshake → one envelope → cleanup, no session written.
  'wallet_sendCalls',
  'wallet_sign',
  'experimental_requestInfo',
]);

/**
 * EIP-1193 methods before a session exists.
 *
 * Connecting is something the dapp asks for: `eth_requestAccounts` or `wallet_connect`.
 * Nothing else creates a session. The allowlist above is served locally, over Coinbase
 * HTTP, or as a handshake → one CAIP-27 envelope → cleanup that writes no session.
 * Every other wallet method rejects with 4100 until the dapp connects.
 */
export async function handleDisconnected(
  context: Eip1193Context,
  args: RequestArguments
): Promise<unknown> {
  const { transport, chain } = context;
  const getChainId = chain.get;

  switch (args.method) {
    // --- Defaults: nothing is connected yet ---
    case 'eth_accounts':
      return [];
    case 'net_version':
      return getChainId();
    case 'eth_chainId':
      return hexStringFromNumber(getChainId());
    case 'wallet_switchEthereumChain': {
      chain.select(parseSwitchChainId(args.params));
      return undefined;
    }
    // Same as old CoinbaseWalletProvider: Coinbase HTTP before a session exists.
    // After pairing, Signer defaulted this to chain.rpcUrl (`handleConnected`).
    case 'wallet_getCallsStatus':
      return fetchRPCRequest(args, CB_WALLET_RPC_URL);

    // --- Connect: translate EIP-1193 into CAIP-25. ---
    case 'eth_requestAccounts': {
      const { session } = await connectEip155(context);
      return projectEthAccounts(session);
    }
    case 'wallet_connect': {
      const { result } = await connectEip155(context, args);
      return result;
    }

    // --- Direct CAIP-27: one-shot only. Anything else needs a session first. ---
    case WALLET_INVOKE_METHOD: {
      const envelope = parseCaip27(args);
      // A caller-supplied session id expresses persisted-session intent and must never bypass pairing.
      if (envelope.sessionId === undefined && EPHEMERAL_METHODS.has(envelope.request.method)) {
        return invokeEphemeral(envelope, transport, eip155Translator);
      }
      throw standardErrors.provider.unauthorized(
        "Must call 'eth_requestAccounts' before other methods"
      );
    }

    default: {
      // Only the wallet-bound members reach here; the rest have explicit cases above.
      if (EPHEMERAL_METHODS.has(args.method)) {
        return invokeEphemeral(toEnvelope(args, getChainId()), transport, eip155Translator);
      }
      throw standardErrors.provider.unauthorized(
        "Must call 'eth_requestAccounts' before other methods"
      );
    }
  }
}
