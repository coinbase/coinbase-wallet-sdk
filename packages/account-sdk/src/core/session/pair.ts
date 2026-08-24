import type { RequestArguments } from ':core/provider/interface.js';
import type { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { persistSubAccount } from ':core/sub-account/accounts.js';
import { initSubAccountConfig } from ':core/sub-account/utils.js';
import type { WalletRuntime } from ':core/transport/index.js';
import { Address } from ':core/type/index.js';
import { assertSubAccount } from ':util/assertSubAccount.js';
import { numberToHex } from 'viem';
import { projectEthAccounts, sessionFromAccounts } from './eip155.js';
import type { PairResult } from './ensureSession.js';

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
 * Build the `wallet_connect` params sent after handshake.
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

/** True when a result looks like a `wallet_connect` accounts payload. */
export function isConnectResult(value: unknown): value is ConnectResult {
  return (
    isRecord(value) &&
    Array.isArray(value.accounts) &&
    value.accounts.every((account) => isRecord(account) && typeof account.address === 'string')
  );
}

/**
 * Write `wallet_connect` accounts onto the session + EIP-1193 store.
 *
 * First account's capabilities may include spend-permission grants and
 * `subAccounts` (when pairing injected `addSubAccount`). Those are persisted
 * here so later `invoke` / sub-account dispatch can see them.
 */
export function ingestConnectResult(runtime: WalletRuntime, value: ConnectResult) {
  const granted = value.accounts[0]?.capabilities;
  const addresses = value.accounts.map((account) => account.address as Address);

  // --- EIP-1193 account slice (legacy store used by eth_accounts) ---
  // Accounts only — do not overwrite handshake EIP-5792 `account.capabilities`.
  // SIWE / spend / subAccounts live on the connect result and the slices below.
  runtime.store.account.set({
    accounts: addresses,
    chain: { ...runtime.store.account.get().chain, id: runtime.chainId() },
  });

  // --- Optional grants on the first connected account ---
  const spend = granted?.spendPermissions;
  if (isRecord(spend) && Array.isArray(spend.permissions) && spend.permissions.every(isRecord)) {
    runtime.store.spendPermissions.set(spend.permissions as SpendPermission[]);
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

  // --- Kernel session (what `invoke` / `ensureSession` read) ---
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
 * Create a session: handshake, then `wallet_connect`, then persist.
 *
 * This is the kernel **pair** verb. Call it when there is no session (or
 * `ensureSession` decided the stored scopes are not enough). It does not send
 * dapp method calls — that is `invoke`.
 *
 * Steps:
 * 1. `handshake` — ECDH public-key exchange (plaintext). Later `send` encrypts.
 * 2. Inject `addSubAccount` when `creation: 'on-connect'`.
 * 3. Encrypted `wallet_connect` (SIWE / spend-permission / addSubAccount caps
 *    from the dapp request win over SDK-injected caps).
 * 4. `ingestConnectResult` writes Session + account store.
 */
export async function pair(
  runtime: WalletRuntime,
  request?: RequestArguments
): Promise<PairResult> {
  // 1. Key exchange (must happen before any encrypted RPC)
  await runtime.handshake({ method: 'handshake' });

  // 2. SDK-injected capabilities (sub-account on connect)
  await initSubAccountConfig(runtime.store);
  const injected = runtime.store.subAccountsConfig.get()?.capabilities ?? {};

  // 3. Request accounts
  const result = await runtime.send({
    method: 'wallet_connect',
    params: walletConnectParams(request, injected),
  });
  if (!isConnectResult(result)) {
    throw new Error('wallet_connect did not return accounts');
  }

  // 4. Persist session
  return { session: ingestConnectResult(runtime, result), result };
}
