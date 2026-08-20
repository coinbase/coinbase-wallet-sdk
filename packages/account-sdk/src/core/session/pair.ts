import type { PopupRuntime } from ':core/channel/types.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { persistSubAccount } from ':core/sub-account/accounts.js';
import { initSubAccountConfig } from ':core/sub-account/utils.js';
import { Address } from ':core/type/index.js';
import { assertSubAccount } from ':util/assertSubAccount.js';
import { numberToHex } from 'viem';
import type { PairResult } from './createSession.js';
import { projectEthAccounts, sessionFromAccounts } from './eip155.js';

export type ConnectResult = {
  accounts: {
    address: string;
    capabilities?: Record<string, unknown>;
  }[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Build the `wallet_connect` params posted to the popup after handshake.
 *
 * Merges SDK-injected capabilities (e.g. `addSubAccount` when `creation: 'on-connect'`)
 * with the dapp's params. Dapp capabilities win on key conflict.
 */
export function walletConnectParams(
  request?: RequestArguments,
  injected: Record<string, unknown> = {}
): [{ version: string; capabilities?: Record<string, unknown> }] {
  const first = Array.isArray(request?.params) ? request.params[0] : undefined;
  const obj = isRecord(first) ? first : {};
  const version = typeof obj.version === 'string' && obj.version.length > 0 ? obj.version : '1';
  const dappCaps = isRecord(obj.capabilities) ? obj.capabilities : {};
  const capabilities = { ...injected, ...dappCaps };
  if (Object.keys(capabilities).length === 0) {
    return [{ version }];
  }
  return [{ version, capabilities }];
}

/** True when a popup result looks like a `wallet_connect` accounts payload. */
export function isConnectResult(value: unknown): value is ConnectResult {
  return (
    isRecord(value) &&
    Array.isArray(value.accounts) &&
    value.accounts.every((account) => isRecord(account) && typeof account.address === 'string')
  );
}

/**
 * Write connected accounts onto the session + EIP-1193 store.
 * Persists sub-account + spend-permission grants from the first account's capabilities.
 */
export function ingestConnectResult(runtime: PopupRuntime, value: ConnectResult) {
  const granted = value.accounts[0]?.capabilities;
  const addresses = value.accounts.map((account) => account.address as Address);

  runtime.helpers.account.set({
    accounts: addresses,
    chain: { ...runtime.helpers.account.get().chain, id: runtime.chainId() },
    ...(granted ? { capabilities: granted } : {}),
  });

  const spend = granted?.spendPermissions;
  if (isRecord(spend) && Array.isArray(spend.permissions) && spend.permissions.every(isRecord)) {
    runtime.helpers.spendPermissions.set(spend.permissions as SpendPermission[]);
  }

  const subAccounts = granted?.subAccounts;
  if (Array.isArray(subAccounts) && subAccounts[0]) {
    assertSubAccount(subAccounts[0]);
    persistSubAccount(
      runtime,
      sessionFromAccounts({ accounts: addresses, chainId: runtime.chainId() }),
      {
        address: subAccounts[0].address,
        factory: subAccounts[0].factory,
        factoryData: subAccounts[0].factoryData,
      }
    );
    return (
      runtime.readSession() ??
      sessionFromAccounts({ accounts: addresses, chainId: runtime.chainId() })
    );
  }

  const session = sessionFromAccounts({
    accounts: addresses,
    chainId: runtime.chainId(),
  });
  runtime.writeSession(session);
  runtime.emit?.('accountsChanged', projectEthAccounts(session));
  runtime.emit?.('connect', { chainId: numberToHex(runtime.chainId()) });
  return session;
}

/**
 * Open the keys popup, exchange encryption keys, then request accounts via `wallet_connect`.
 * Injects `addSubAccount` when `creation: 'on-connect'`. Pass the dapp request so SIWE /
 * spend-permission / addSubAccount capabilities reach the wallet.
 */
export async function pair(runtime: PopupRuntime, request?: RequestArguments): Promise<PairResult> {
  await runtime.handshake({ method: 'handshake' });
  await initSubAccountConfig(runtime.helpers);
  const injected = runtime.helpers.subAccountsConfig.get()?.capabilities ?? {};
  const result = await runtime.send({
    method: 'wallet_connect',
    params: walletConnectParams(request, injected),
  });
  if (!isConnectResult(result)) {
    throw new Error('wallet_connect did not return accounts');
  }
  return { session: ingestConnectResult(runtime, result), result };
}
