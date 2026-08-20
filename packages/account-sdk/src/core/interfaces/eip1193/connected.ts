import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import type {
  FetchPermissionRequest,
  FetchPermissionResponse,
} from ':core/rpc/coinbase_fetchPermission.js';
import type { FetchPermissionsResponse } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { WALLET_INVOKE_METHOD, assertInvokeAuthorized, parseCaip27 } from ':core/session/caip27.js';
import {
  type Session,
  eip155ChainId,
  projectEthAccounts,
  withEip155Chain,
} from ':core/session/index.js';
import { invoke } from ':core/session/invoke.js';
import { ingestConnectResult, isConnectResult, walletConnectParams } from ':core/session/pair.js';
import {
  addSubAccount,
  dispatchSubAccount,
  getSubAccounts,
  orderedEthAccounts,
  shouldUseSubAccount,
} from ':core/sub-account/index.js';
import {
  assertFetchPermissionsRequest,
  fillMissingParamsForFetchPermissions,
  initSubAccountConfig,
} from ':core/sub-account/utils.js';
import { WALLET_METHODS, toEnvelope, toLegacyRequest } from ':core/translators/eip155/index.js';
import type { WalletRuntime } from ':core/transport/index.js';
import { hexStringFromNumber } from ':core/type/util.js';
import { fetchRPCRequest } from ':util/provider.js';
import { hexToNumber, numberToHex } from 'viem';
import { switchChainId } from './chainParams.js';

/**
 * EIP-1193 methods after a session exists.
 *
 * Default path is `invoke` (already paired → transport). Two exceptions:
 * - `from` is the cached sub-account → local AA (`dispatchSubAccount`)
 * - chain/account reads are projections of the session (no wallet I/O)
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
    // --- CAIP-27: unwrap to the inner request. Wallet methods keep the
    // envelope chainId via `invoke`; reads / projections re-enter below. ---
    case WALLET_INVOKE_METHOD: {
      const parsed = parseCaip27(args);
      assertInvokeAuthorized(session, parsed);
      const inner = toLegacyRequest(parsed);
      if (shouldUseSubAccount(runtime, inner)) {
        return dispatchSubAccount(runtime, session, inner);
      }
      if (WALLET_METHODS.has(inner.method) || inner.method.startsWith('experimental_')) {
        const chainNum = eip155ChainId(parsed.chainId);
        if (chainNum === null) {
          throw standardErrors.provider.unsupportedMethod(
            `Namespace of ${parsed.chainId} is not enabled in this SDK version`
          );
        }
        return invoke(
          session,
          {
            ...toEnvelope(inner, chainNum),
            ...(parsed.capabilities ? { capabilities: parsed.capabilities } : {}),
            ...(parsed.sessionId ? { sessionId: parsed.sessionId } : {}),
          },
          runtime.transport
        );
      }
      return handleConnected(runtime, inner, session);
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

    // --- Chain: update session locally if we already know the chain ---
    case 'wallet_switchEthereumChain': {
      const chainId = switchChainId(args.params);
      const chain = runtime.store.chains.get().find((item) => item.id === chainId);
      if (chain) {
        runtime.store.account.set({ chain });
        runtime.writeSession(withEip155Chain(session, chainId));
        runtime.emit?.('chainChanged', hexStringFromNumber(chainId));
        return null;
      }
      // Unknown chain: wallet must add/switch it.
      return invoke(session, toEnvelope(args, runtime.chainId()), runtime.transport);
    }

    // --- Re-pair capabilities on an existing session (SIWE, spend, …) ---
    case 'wallet_connect': {
      await initSubAccountConfig(runtime.store);
      const injected = runtime.store.subAccountsConfig.get()?.capabilities ?? {};
      const result = await invoke(
        session,
        toEnvelope(
          { method: 'wallet_connect', params: walletConnectParams(args, injected) },
          runtime.chainId()
        ),
        runtime.transport
      );
      if (isConnectResult(result)) ingestConnectResult(runtime, result);
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

    // --- Sign/send: invoke, else chain JSON-RPC ---
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
