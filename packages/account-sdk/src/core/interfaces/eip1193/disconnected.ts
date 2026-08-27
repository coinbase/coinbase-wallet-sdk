import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { eip155Caip2 } from ':core/session/caip.js';
import { WALLET_INVOKE_METHOD, parseCaip27 } from ':core/session/caip27.js';
import { ensureSession } from ':core/session/ensureSession.js';
import { EIP155_METHODS, projectEthAccounts } from ':core/session/index.js';
import { invoke, invokeEphemeral } from ':core/session/invoke.js';
import type { Envelope } from ':core/session/types.js';
import {
  ingestConnectResult,
  isConnectResult,
  pair,
  prepareWalletConnectRequest,
} from ':core/session/pair.js';
import { WALLET_METHODS, toEnvelope } from ':core/translators/eip155/index.js';
import type { WalletRuntime } from ':core/transport/index.js';
import { hexStringFromNumber } from ':core/type/util.js';
import { fetchRPCRequest } from ':util/provider.js';
import { handleConnected } from './connected.js';
import { switchChainId } from './chainParams.js';

const DISCONNECTED_EPHEMERAL_METHODS = new Set([
  'wallet_sendCalls',
  'wallet_sign',
  'experimental_requestInfo',
]);

function isDisconnectedEphemeralMethod(method: string): boolean {
  return DISCONNECTED_EPHEMERAL_METHODS.has(method);
}

/** Temporary handshake keys must be cleared even when transport or response decoding fails. */
async function sendEphemeral(runtime: WalletRuntime, envelope: Envelope): Promise<unknown> {
  try {
    await runtime.handshake({ method: 'handshake' });
    return await invokeEphemeral(envelope, runtime.transport);
  } finally {
    await runtime.cleanup();
  }
}

/**
 * EIP-1193 methods before a session exists.
 *
 * The explicit ephemeral allowlist uses handshake → one CAIP-27 envelope →
 * cleanup without creating a session. Other wallet-bound methods establish
 * exact CAIP-25 authorization before invocation.
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
      return runtime.chainId();
    case 'eth_chainId':
      return hexStringFromNumber(runtime.chainId());
    case 'wallet_switchEthereumChain': {
      runtime.store.account.set({ chain: { id: switchChainId(args.params) } });
      return undefined;
    }
    // Same as old BaseAccountProvider: Coinbase HTTP before a session exists.
    // After pairing, Signer defaulted this to chain.rpcUrl (`handleConnected`).
    case 'wallet_getCallsStatus':
      return fetchRPCRequest(args, CB_WALLET_RPC_URL);

    // --- Pair: handshake + CAIP-25 → persist Session ---
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

    // --- Direct CAIP-27: establish its requested chain + method first. ---
    case WALLET_INVOKE_METHOD: {
      let envelope = parseCaip27(args);
      // A caller-supplied session id expresses persisted-session intent and must never bypass pairing.
      if (
        envelope.sessionId === undefined &&
        isDisconnectedEphemeralMethod(envelope.request.method)
      ) {
        return sendEphemeral(runtime, envelope);
      }
      if (envelope.request.method === 'wallet_connect') {
        envelope = {
          ...envelope,
          request: await prepareWalletConnectRequest(runtime, envelope.request),
        };
      }
      // The follow-up invoke needs both the baseline family grant and this exact inner method.
      const methods = [...new Set([...EIP155_METHODS, envelope.request.method])];
      const { session } = await ensureSession({
        session: runtime.readSession(),
        requiredScopes: [{ chainId: envelope.chainId, methods: [envelope.request.method] }],
        pair: () =>
          pair(
            runtime,
            envelope.request.method === 'wallet_connect' ? envelope.request : undefined,
            { chainId: envelope.chainId, methods }
          ),
      });
      const result = await invoke(session, envelope, runtime.transport);
      if (envelope.request.method === 'wallet_connect' && isConnectResult(result)) {
        ingestConnectResult(runtime, result, session, envelope.chainId);
      }
      return result;
    }

    default: {
      if (isDisconnectedEphemeralMethod(args.method)) {
        return sendEphemeral(runtime, toEnvelope(args, runtime.chainId()));
      }
      if (
        WALLET_METHODS.has(args.method) ||
        args.method.startsWith('experimental_') ||
        args.method === 'wallet_addSubAccount'
      ) {
        const chainId = eip155Caip2(runtime.chainId());
        // Include the target method because the wallet response, not our defaults, defines the grant.
        const methods = [...new Set([...EIP155_METHODS, args.method])];
        const { session } = await ensureSession({
          session: runtime.readSession(),
          requiredScopes: [{ chainId, methods: [args.method] }],
          pair: () => pair(runtime, undefined, { chainId, methods }),
        });
        // Re-enter connected routing so method-specific behavior uses the newly authoritative grant.
        return handleConnected(runtime, args, session);
      }
      throw standardErrors.provider.unauthorized(
        "Must call 'eth_requestAccounts' before other methods"
      );
    }
  }
}
