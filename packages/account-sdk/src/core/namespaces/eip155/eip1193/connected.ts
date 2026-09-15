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
import {
  addSubAccount,
  dispatchSubAccount,
  getSubAccounts,
  orderedEthAccounts,
  shouldUseSubAccount,
} from './sub-account/index.js';
import {
  assertFetchPermissionsRequest,
  fillMissingParamsForFetchPermissions,
} from './sub-account/utils.js';
import { eip155Caip2, eip155ChainId } from '../caip.js';
import { toEnvelope } from '../envelope.js';
import { WALLET_METHODS } from '../methods.js';
import {
  firstEip155ChainId,
  isKnownEip155Chain,
  projectEthAccounts,
  projectEthAccountsForChain,
  rpcUrlForEip155Chain,
} from '../session.js';
import { eip155Translator } from '../translator.js';
import { fetchRPCRequest } from ':util/provider.js';
import { hexToNumber, numberToHex } from 'viem';
import { getCapabilities } from './capabilities.js';
import { switchChainId } from './chainParams.js';
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
 * Authorize the active chain, expanding the CAIP-25 grant when the wallet granted
 * a narrower chain set than the provider is now using.
 *
 * Switching chains is provider state and never rewrites authorization. A wallet that
 * grants the eip155 namespace covers every chain, so this never opens a popup. Wallets
 * that still grant one chain at a time expand here, on the first request that needs it,
 * rather than failing `assertInvokeAuthorized` after a successful switch.
 */
async function sessionForChain(
  context: Eip1193Context,
  session: Session,
  chainId: number
): Promise<Session> {
  if (session.scopes[eip155Caip2(chainId)]?.accounts.length) return session;
  const { session: expanded } = await connectEip155(context, undefined, {
    chainId: eip155Caip2(chainId),
    ...(session.sessionId ? { sessionId: session.sessionId } : {}),
  });
  return expanded;
}

/**
 * EIP-1193 methods after a session exists.
 *
 * Default path is `invoke` (already paired → transport). Exceptions:
 * - `from` is the cached sub-account → local AA (`dispatchSubAccount`)
 * - chain/account reads and `wallet_getCapabilities` are projections (no wallet I/O)
 * - unsigned chain JSON-RPC (incl. `wallet_getCallsStatus`) uses `chain.rpcUrl`
 */
export async function handleConnected(
  context: Eip1193Context,
  args: RequestArguments,
  session: Session
): Promise<unknown> {
  const { transport, cache, emit, chain } = context;
  const getChainId = chain.get;

  // Fork: sub-account `from` is signed locally, not sent as the global account.
  if (shouldUseSubAccount(cache, args)) {
    return dispatchSubAccount(context, session, args);
  }

  switch (args.method) {
    // --- Direct CAIP-27: wallet_connect is CAIP-25; invoke everything else as-is. ---
    case WALLET_INVOKE_METHOD: {
      const parsed = parseCaip27(args);
      const inner = parsed.request;
      if (shouldUseSubAccount(cache, inner)) {
        return dispatchSubAccount(context, session, inner);
      }
      if (inner.method === 'wallet_connect') {
        const { result } = await connectEip155(context, inner, {
          chainId: parsed.chainId,
          sessionId: parsed.sessionId ?? session.sessionId,
        });
        const chainId = eip155ChainId(parsed.chainId);
        if (chainId !== null) chain.select(chainId, { notify: false });
        return result;
      }
      return invoke(session, parsed, transport, eip155Translator);
    }

    // --- Session projections (no wallet round-trip) ---
    case 'eth_requestAccounts':
    case 'eth_accounts': {
      // A locally selected chain can sit outside a narrow grant; the account list is
      // the same across eip155 chains, so fall back to the session-wide projection.
      const granted = projectEthAccountsForChain(session, getChainId());
      const accounts = orderedEthAccounts(
        cache,
        granted.length > 0 ? granted : projectEthAccounts(session)
      );
      emit('connect', { chainId: numberToHex(getChainId()) });
      return accounts;
    }
    case 'eth_coinbase': {
      const accounts = await handleConnected(context, { method: 'eth_accounts' }, session);
      return (accounts as string[])[0];
    }
    case 'net_version':
      return getChainId();
    case 'eth_chainId':
      return numberToHex(getChainId());
    case 'wallet_getCapabilities':
      return getCapabilities(cache, args, session, getChainId());

    // --- Chain: provider-local selection; authorization is never rewritten here ---
    case 'wallet_switchEthereumChain': {
      const chainId = switchChainId(args.params);
      if (applyLocalChain(context, session, chainId)) return null;
      const authorizationChainId = firstEip155ChainId(session);
      if (authorizationChainId === undefined) {
        throw standardErrors.provider.unauthorized('No EIP-155 account is authorized');
      }
      const result = await invoke(
        session,
        toEnvelope(args, authorizationChainId),
        transport,
        eip155Translator
      );
      if (result === null) chain.select(chainId);
      return result;
    }

    // --- Refresh grants through CAIP-25 and translate back to ERC-7846. ---
    case 'wallet_connect': {
      const { result } = await connectEip155(context, args, {
        sessionId: session.sessionId,
      });
      return result;
    }

    // --- Sub-account RPC (still uses invoke for the global account) ---
    case 'wallet_addSubAccount':
      return addSubAccount(context, session, args);
    case 'wallet_getSubAccounts':
      return getSubAccounts(cache, args, session, getChainId());

    // --- Spend-permission HTTP (not the wallet transport) ---
    case 'coinbase_fetchPermissions': {
      assertFetchPermissionsRequest(args);
      const completeRequest = fillMissingParamsForFetchPermissions(
        args,
        session,
        cache,
        getChainId()
      );
      const permissions = (await fetchRPCRequest(
        completeRequest,
        CB_WALLET_RPC_URL
      )) as FetchPermissionsResponse;
      const requestedChainId = hexToNumber(completeRequest.params[0].chainId);
      cache.spendPermissions.set(
        permissions.permissions.map((permission) => ({
          ...permission,
          chainId: requestedChainId,
        }))
      );
      return permissions;
    }
    case 'coinbase_fetchPermission': {
      const response = (await fetchRPCRequest(
        args as FetchPermissionRequest,
        CB_WALLET_RPC_URL
      )) as FetchPermissionResponse;
      if (response.permission?.chainId) {
        cache.spendPermissions.set([response.permission]);
      }
      return response;
    }

    // --- Sign/send: invoke, else chain JSON-RPC (incl. wallet_getCallsStatus) ---
    default: {
      if (WALLET_METHODS.has(args.method) || args.method.startsWith('experimental_')) {
        const authorized = await sessionForChain(context, session, getChainId());
        return invoke(authorized, toEnvelope(args, getChainId()), transport, eip155Translator);
      }
      const rpcUrl = rpcUrlForEip155Chain(session, getChainId());
      if (!rpcUrl) throw standardErrors.rpc.internal('No RPC URL set for chain');
      return fetchRPCRequest(args, rpcUrl);
    }
  }
}
