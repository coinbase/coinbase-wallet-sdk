import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import {
  addSubAccount,
  dispatchSubAccount,
  getSubAccounts,
  orderedEthAccounts,
  shouldUseSubAccount,
} from ':core/namespaces/eip155/eip1193/sub-account/index.js';
import {
  assertFetchPermissionsRequest,
  fillMissingParamsForFetchPermissions,
} from ':core/namespaces/eip155/eip1193/sub-account/utils.js';
import { WALLET_METHODS, toEnvelope } from ':core/namespaces/eip155/index.js';
import { RequestArguments } from ':core/provider/interface.js';
import type {
  FetchPermissionRequest,
  FetchPermissionResponse,
} from ':core/rpc/coinbase_fetchPermission.js';
import type { FetchPermissionsResponse } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { WALLET_INVOKE_METHOD, parseCaip27 } from ':core/session/caip27.js';
import {
  EIP155_METHODS,
  type Session,
  eip155Caip2,
  projectEthAccounts,
  sessionCovers,
  withEip155Chain,
} from ':core/session/index.js';
import { invoke } from ':core/session/invoke.js';
import {
  ingestConnectResult,
  isConnectResult,
  pair,
  prepareWalletConnectRequest,
} from ':core/session/pair.js';
import type { WalletRuntime } from ':core/transport/index.js';
import { hexStringFromNumber } from ':core/type/util.js';
import { fetchRPCRequest } from ':util/provider.js';
import { hexToNumber, numberToHex } from 'viem';
import { getCapabilities } from './capabilities.js';
import { switchChainId } from './chainParams.js';

/** Persist an authorized chain on the store + session and emit `chainChanged`. */
function applyLocalChain(runtime: WalletRuntime, session: Session, chainId: number): boolean {
  if (!sessionCovers(session, [eip155Caip2(chainId)])) return false;
  const chain =
    runtime.store.chains.get().find((item) => item.id === chainId) ??
    (runtime.store.account.get().chain?.id === chainId
      ? runtime.store.account.get().chain
      : { id: chainId });
  runtime.store.account.set({ chain });
  runtime.writeSession(withEip155Chain(session, chainId));
  runtime.emit?.('chainChanged', hexStringFromNumber(chainId));
  return true;
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
  runtime: WalletRuntime,
  args: RequestArguments,
  session: Session
): Promise<unknown> {
  // Fork: sub-account `from` is signed locally, not sent as the global account.
  if (shouldUseSubAccount(runtime, args)) {
    return dispatchSubAccount(runtime, session, args);
  }

  switch (args.method) {
    // --- Direct CAIP-27: preserve the caller's target and invoke it as-is. ---
    case WALLET_INVOKE_METHOD: {
      let parsed = parseCaip27(args);
      let inner = parsed.request;
      if (shouldUseSubAccount(runtime, inner)) {
        return dispatchSubAccount(runtime, session, inner);
      }
      if (inner.method === 'wallet_connect') {
        inner = await prepareWalletConnectRequest(runtime, inner);
        parsed = { ...parsed, request: inner };
      }
      const result = await invoke(session, parsed, runtime.transport);
      if (inner.method === 'wallet_connect' && isConnectResult(result)) {
        ingestConnectResult(runtime, result, session, parsed.chainId);
      }
      return result;
    }

    // --- Session projections (no wallet round-trip) ---
    case 'eth_requestAccounts':
    case 'eth_accounts': {
      const accounts = orderedEthAccounts(
        runtime,
        (runtime.store.account.get().accounts ?? []) as `0x${string}`[]
      );
      runtime.emit?.('connect', { chainId: numberToHex(runtime.chainId()) });
      return accounts.length > 0
        ? accounts
        : orderedEthAccounts(runtime, projectEthAccounts(session));
    }
    case 'eth_coinbase': {
      const accounts = await handleConnected(runtime, { method: 'eth_accounts' }, session);
      return (accounts as string[])[0];
    }
    case 'net_version':
      return runtime.chainId();
    case 'eth_chainId':
      return numberToHex(runtime.chainId());
    case 'wallet_getCapabilities':
      return getCapabilities(runtime, args, session);

    // --- Chain: switch locally when the exact target scope is authorized ---
    case 'wallet_switchEthereumChain': {
      const chainId = switchChainId(args.params);
      if (applyLocalChain(runtime, session, chainId)) return null;
      const targetChainId = eip155Caip2(chainId);
      if (!sessionCovers(session, [targetChainId])) {
        // A missing chain is an authorization expansion; wallet_switch alone cannot grant a scope.
        const { session: updated } = await pair(runtime, undefined, {
          chainId: targetChainId,
          methods: EIP155_METHODS,
          sessionId: session.sessionId,
        });
        if (!applyLocalChain(runtime, updated, chainId)) {
          throw standardErrors.provider.unsupportedChain();
        }
        return null;
      }
      // Unknown chain: wallet must add/switch it, then apply locally (EIP-3326 null).
      const result = await invoke(session, toEnvelope(args, runtime.chainId()), runtime.transport);
      if (result === null) applyLocalChain(runtime, session, chainId);
      return result;
    }

    // --- Refresh grants inside the existing session; CAIP-25 is only for scope expansion. ---
    case 'wallet_connect': {
      // ERC-7846 wallet_connect remains an inner CAIP-27 method once the chain is authorized.
      const request = await prepareWalletConnectRequest(runtime, args);
      const result = await invoke(
        session,
        toEnvelope(request, runtime.chainId()),
        runtime.transport
      );
      if (isConnectResult(result)) ingestConnectResult(runtime, result, session);
      return result;
    }

    // --- Sub-account RPC (still uses invoke for the global account) ---
    case 'wallet_addSubAccount':
      return addSubAccount(runtime, session, args);
    case 'wallet_getSubAccounts':
      return getSubAccounts(runtime, args);

    // --- Spend-permission HTTP (not the wallet transport) ---
    case 'coinbase_fetchPermissions': {
      assertFetchPermissionsRequest(args);
      const completeRequest = fillMissingParamsForFetchPermissions(args);
      const permissions = (await fetchRPCRequest(
        completeRequest,
        CB_WALLET_RPC_URL
      )) as FetchPermissionsResponse;
      const requestedChainId = hexToNumber(completeRequest.params[0].chainId);
      runtime.store.spendPermissions.set(
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
        runtime.store.spendPermissions.set([response.permission]);
      }
      return response;
    }

    // --- Sign/send: invoke, else chain JSON-RPC (incl. wallet_getCallsStatus) ---
    default: {
      if (WALLET_METHODS.has(args.method) || args.method.startsWith('experimental_')) {
        return invoke(session, toEnvelope(args, runtime.chainId()), runtime.transport);
      }
      const rpcUrl = runtime.store.account.get().chain?.rpcUrl;
      if (!rpcUrl) throw standardErrors.rpc.internal('No RPC URL set for chain');
      return fetchRPCRequest(args, rpcUrl);
    }
  }
}
