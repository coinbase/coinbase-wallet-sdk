import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import type {
  FetchPermissionRequest,
  FetchPermissionResponse,
} from ':core/rpc/coinbase_fetchPermission.js';
import type { FetchPermissionsResponse } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { WALLET_INVOKE_METHOD } from ':core/session/caip27.js';
import type { Session } from ':core/session/index.js';
import { invoke } from ':core/session/invoke.js';
import { assertFetchPermissionsRequest } from './params.js';
import { eip155Translator, toEnvelope } from '../envelope.js';
import { EIP155_METHODS } from '../methods.js';
import {
  isKnownEip155Chain,
  projectEthAccounts,
  rpcUrlForEip155Chain,
  withKnownEip155Chain,
} from '../session.js';
import { fetchRPCRequest } from ':util/provider.js';
import { numberToHex } from 'viem';
import { getCapabilities } from './capabilities.js';
import { parseSwitchChainId } from './params.js';
import { connectEip155 } from './connect.js';
import type { Eip1193Context } from './context.js';
import { parseCaip27 } from './parseCaip27.js';

/** Select a wallet-known chain locally and emit `chainChanged`. */
function applyLocalChain(context: Eip1193Context, session: Session, chainId: number): boolean {
  if (!isKnownEip155Chain(session, chainId)) return false;
  context.chain.select(chainId);
  return true;
}

/**
 * Record a chain the wallet just accepted, so later reads can reach it.
 *
 * The wallet's catalog is the only source of chain support, and a wallet-side switch
 * is the one moment it grows without a reconnect. Authorization is untouched.
 */
function rememberChain(context: Eip1193Context, session: Session, chainId: number): void {
  // Re-read so a session another interface wrote during the round trip is not clobbered.
  const current = context.transport.readSession() ?? session;
  if (isKnownEip155Chain(current, chainId)) return;
  context.transport.writeSession(withKnownEip155Chain(current, chainId));
}

/**
 * EIP-1193 methods after a session exists.
 *
 * Default path is `invoke` (already paired → transport). Exceptions:
 * - the wallet's own methods go over the transport
 * - chain/account reads and `wallet_getCapabilities` are projections (no wallet I/O)
 * - unsigned chain JSON-RPC (incl. `wallet_getCallsStatus`) uses `chain.rpcUrl`
 */
export async function handleConnected(
  context: Eip1193Context,
  args: RequestArguments,
  session: Session
): Promise<unknown> {
  const { transport, emit, chain } = context;
  const getChainId = chain.get;

  switch (args.method) {
    // --- Direct CAIP-27: invoke the inner method on this session. ---
    case WALLET_INVOKE_METHOD:
      return invoke(session, parseCaip27(args), transport, eip155Translator);

    // --- Session projections (no wallet round-trip) ---
    case 'eth_requestAccounts':
    case 'eth_accounts':
    case 'eth_coinbase': {
      // Authorization is namespace-wide, so the account list does not depend on the
      // active chain. `eth_coinbase` is the same list narrowed to the primary account.
      const accounts = projectEthAccounts(session);
      emit('connect', { chainId: numberToHex(getChainId()) });
      return args.method === 'eth_coinbase' ? accounts[0] : accounts;
    }
    case 'net_version':
      return getChainId();
    case 'eth_chainId':
      return numberToHex(getChainId());
    case 'wallet_getCapabilities':
      return getCapabilities(args, session);

    // --- Chain: provider-local selection; authorization is never rewritten here ---
    case 'wallet_switchEthereumChain': {
      const chainId = parseSwitchChainId(args.params);
      if (applyLocalChain(context, session, chainId)) return null;
      // Not in the wallet's catalog: ask the wallet, which either adds the chain or
      // returns 4902. The request rides the active chain, which the namespace-wide
      // grant already authorizes — switching never needs new authorization.
      const result = await invoke(
        session,
        toEnvelope(args, getChainId()),
        transport,
        eip155Translator
      );
      if (result === null) {
        rememberChain(context, session, chainId);
        chain.select(chainId);
      }
      return result;
    }

    // --- Refresh grants through CAIP-25 and translate back to ERC-7846. ---
    case 'wallet_connect': {
      const { result } = await connectEip155(context, args, {
        sessionId: session.sessionId,
      });
      return result;
    }

    // --- Spend-permission HTTP (not the wallet transport) ---
    case 'coinbase_fetchPermissions': {
      assertFetchPermissionsRequest(args);
      return (await fetchRPCRequest(args, CB_WALLET_RPC_URL)) as FetchPermissionsResponse;
    }
    case 'coinbase_fetchPermission': {
      return (await fetchRPCRequest(
        args as FetchPermissionRequest,
        CB_WALLET_RPC_URL
      )) as FetchPermissionResponse;
    }

    // --- Sign/send: invoke, else chain JSON-RPC (incl. wallet_getCallsStatus) ---
    default: {
      if (EIP155_METHODS.includes(args.method) || args.method.startsWith('experimental_')) {
        return invoke(session, toEnvelope(args, getChainId()), transport, eip155Translator);
      }
      const rpcUrl = rpcUrlForEip155Chain(session, getChainId());
      if (!rpcUrl) throw standardErrors.rpc.internal('No RPC URL set for chain');
      return fetchRPCRequest(args, rpcUrl);
    }
  }
}
