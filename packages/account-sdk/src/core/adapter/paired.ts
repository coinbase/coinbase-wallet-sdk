import type { PopupRuntime } from ':core/channel/types.js';
import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { POPUP_METHODS, toEnvelope } from ':core/namespaces/eip155/index.js';
import { RequestArguments } from ':core/provider/interface.js';
import type {
  FetchPermissionRequest,
  FetchPermissionResponse,
} from ':core/rpc/coinbase_fetchPermission.js';
import type { FetchPermissionsResponse } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { type SessionData, projectEthAccounts, withEip155Chain } from ':core/session/index.js';
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
import { hexStringFromNumber } from ':core/type/util.js';
import { fetchRPCRequest } from ':util/provider.js';
import { hexToNumber, numberToHex } from 'viem';
import { switchChainId } from './chainParams.js';

/**
 * EIP-1193 methods after a session exists.
 *
 * If `from` is the sub-account, the request is signed locally (or funded via the global
 * popup). Otherwise sign/send go through `invoke` → popup. `wallet_addSubAccount` /
 * `wallet_getSubAccounts` are handled here.
 */
export async function handlePaired(
  runtime: PopupRuntime,
  args: RequestArguments,
  session: SessionData
): Promise<unknown> {
  if (shouldUseSubAccount(runtime, args)) {
    return dispatchSubAccount(runtime, session, args);
  }

  switch (args.method) {
    case 'eth_requestAccounts':
    case 'eth_accounts': {
      const accounts = orderedEthAccounts(
        runtime,
        (runtime.helpers.account.get().accounts ?? []) as `0x${string}`[]
      );
      runtime.emit?.('connect', { chainId: numberToHex(runtime.chainId()) });
      return accounts.length > 0
        ? accounts
        : orderedEthAccounts(runtime, projectEthAccounts(session));
    }
    case 'eth_coinbase': {
      const accounts = await handlePaired(runtime, { method: 'eth_accounts' }, session);
      return (accounts as string[])[0];
    }
    case 'net_version':
      return runtime.chainId();
    case 'eth_chainId':
      return numberToHex(runtime.chainId());
    case 'wallet_switchEthereumChain': {
      const chainId = switchChainId(args.params);
      const chain = runtime.helpers.chains.get().find((item) => item.id === chainId);
      if (chain) {
        runtime.helpers.account.set({ chain });
        runtime.writeSession(withEip155Chain(session, chainId));
        runtime.emit?.('chainChanged', hexStringFromNumber(chainId));
        return null;
      }
      return invoke(session, toEnvelope(session, args, runtime.chainId()), runtime.channel);
    }
    case 'wallet_connect': {
      await initSubAccountConfig(runtime.helpers);
      const injected = runtime.helpers.subAccountsConfig.get()?.capabilities ?? {};
      const result = await invoke(
        session,
        toEnvelope(
          session,
          { method: 'wallet_connect', params: walletConnectParams(args, injected) },
          runtime.chainId()
        ),
        runtime.channel
      );
      if (isConnectResult(result)) ingestConnectResult(runtime, result);
      return result;
    }
    case 'wallet_addSubAccount':
      return addSubAccount(runtime, session, args);
    case 'wallet_getSubAccounts':
      return getSubAccounts(runtime, args);
    case 'coinbase_fetchPermissions': {
      assertFetchPermissionsRequest(args);
      const completeRequest = fillMissingParamsForFetchPermissions(args);
      const permissions = (await fetchRPCRequest(
        completeRequest,
        CB_WALLET_RPC_URL
      )) as FetchPermissionsResponse;
      const requestedChainId = hexToNumber(completeRequest.params[0].chainId);
      runtime.helpers.spendPermissions.set(
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
        runtime.helpers.spendPermissions.set([response.permission]);
      }
      return response;
    }
    default: {
      if (POPUP_METHODS.has(args.method) || args.method.startsWith('experimental_')) {
        return invoke(session, toEnvelope(session, args, runtime.chainId()), runtime.channel);
      }
      const rpcUrl = runtime.helpers.account.get().chain?.rpcUrl;
      if (!rpcUrl) throw standardErrors.rpc.internal('No RPC URL set for chain');
      return fetchRPCRequest(args, rpcUrl);
    }
  }
}
