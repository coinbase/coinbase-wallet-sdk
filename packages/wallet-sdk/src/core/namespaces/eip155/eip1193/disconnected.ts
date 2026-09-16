import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { activeSession } from ':core/session/activeSession.js';
import { WALLET_INVOKE_METHOD } from ':core/session/caip27.js';
import { ensureSession } from ':core/session/ensureSession.js';
import { toEnvelope } from '../envelope.js';
import { WALLET_METHODS } from '../methods.js';
import { EIP155_METHODS, projectEthAccountsForChain } from '../session.js';
import { eip155Translator } from '../translator.js';
import { invoke, invokeEphemeral } from ':core/session/invoke.js';
import type { Envelope } from ':core/session/types.js';
import type { WalletTransport } from ':core/transport/index.js';
import { hexStringFromNumber } from ':core/type/util.js';
import { fetchRPCRequest } from ':util/provider.js';
import { eip155Caip2, eip155ChainId } from '../caip.js';
import { switchChainId } from './chainParams.js';
import { connectEip155 } from './connect.js';
import { handleConnected } from './connected.js';
import type { Eip1193Context } from './context.js';
import { parseCaip27 } from './parseCaip27.js';

const DISCONNECTED_EPHEMERAL_METHODS = new Set([
  'wallet_sendCalls',
  'wallet_sign',
  'experimental_requestInfo',
]);

function isDisconnectedEphemeralMethod(method: string): boolean {
  return DISCONNECTED_EPHEMERAL_METHODS.has(method);
}

/** Temporary handshake keys must be cleared even when transport or response decoding fails. */
async function sendEphemeral(transport: WalletTransport, envelope: Envelope): Promise<unknown> {
  try {
    await transport.handshake({ method: 'handshake' });
    return await invokeEphemeral(envelope, transport, eip155Translator);
  } finally {
    await transport.cleanup();
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
      chain.select(switchChainId(args.params), { notify: false });
      return undefined;
    }
    // Same as old CoinbaseWalletProvider: Coinbase HTTP before a session exists.
    // After pairing, Signer defaulted this to chain.rpcUrl (`handleConnected`).
    case 'wallet_getCallsStatus':
      return fetchRPCRequest(args, CB_WALLET_RPC_URL);

    // --- Connect: translate EIP-1193 into CAIP-25. ---
    case 'eth_requestAccounts': {
      const session = await ensureSession({
        session: undefined,
        requiredScopes: [eip155Caip2(getChainId())],
        createSession: async () => (await connectEip155(context)).session,
      });
      return projectEthAccountsForChain(session, getChainId());
    }
    case 'wallet_connect': {
      const { result } = await connectEip155(context, args);
      return result;
    }

    // --- Direct CAIP-27: wallet_connect is CAIP-25; authorize other methods before invoke. ---
    case WALLET_INVOKE_METHOD: {
      const envelope = parseCaip27(args);
      if (envelope.request.method === 'wallet_connect') {
        const { result } = await connectEip155(context, envelope.request, {
          chainId: envelope.chainId,
          sessionId: envelope.sessionId ?? activeSession(transport.readSession())?.sessionId,
        });
        const chainId = eip155ChainId(envelope.chainId);
        if (chainId !== null) chain.select(chainId, { notify: false });
        return result;
      }
      // A caller-supplied session id expresses persisted-session intent and must never bypass pairing.
      if (
        envelope.sessionId === undefined &&
        isDisconnectedEphemeralMethod(envelope.request.method)
      ) {
        return sendEphemeral(transport, envelope);
      }
      // The follow-up invoke needs both the baseline family grant and this exact inner method.
      const methods = [...new Set([...EIP155_METHODS, envelope.request.method])];
      const session = await ensureSession({
        session: activeSession(transport.readSession()),
        requiredScopes: [{ chainId: envelope.chainId, methods: [envelope.request.method] }],
        createSession: async () =>
          (await connectEip155(context, undefined, { chainId: envelope.chainId, methods })).session,
      });
      return invoke(session, envelope, transport, eip155Translator);
    }

    default: {
      if (isDisconnectedEphemeralMethod(args.method)) {
        return sendEphemeral(transport, toEnvelope(args, getChainId()));
      }
      if (WALLET_METHODS.has(args.method) || args.method.startsWith('experimental_')) {
        const chainId = eip155Caip2(getChainId());
        // Include the target method because the wallet response, not our defaults, defines the grant.
        const methods = [...new Set([...EIP155_METHODS, args.method])];
        const session = await ensureSession({
          session: activeSession(transport.readSession()),
          requiredScopes: [{ chainId, methods: [args.method] }],
          createSession: async () =>
            (await connectEip155(context, undefined, { chainId, methods })).session,
        });
        // Re-enter connected routing so method-specific behavior uses the newly authoritative grant.
        return handleConnected(context, args, session);
      }
      throw standardErrors.provider.unauthorized(
        "Must call 'eth_requestAccounts' before other methods"
      );
    }
  }
}
