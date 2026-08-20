import type { Session } from ':core/session/index.js';
import { sessionFromAccounts } from ':core/session/index.js';
import type { WalletRuntime } from ':core/transport/index.js';
import type { Address } from ':core/type/index.js';
import type { SubAccount } from ':store/store.js';
import { numberToHex } from 'viem';
import { appendWithoutDuplicates, prependWithoutDuplicates } from './utils.js';

/**
 * EIP-1193 accounts with the sub-account first or last based on `defaultAccount`.
 */
export function orderedEthAccounts(runtime: WalletRuntime, accounts: Address[]): Address[] {
  const sub = runtime.store.subAccounts.get()?.address;
  if (!sub) return accounts;
  return runtime.store.subAccountsConfig.get()?.defaultAccount === 'sub'
    ? prependWithoutDuplicates(accounts, sub)
    : appendWithoutDuplicates(accounts, sub);
}

/**
 * Persist a sub-account on the store + session and emit `accountsChanged`.
 * Called from `ingestConnectResult` (on-connect) and `addSubAccount`.
 */
export function persistSubAccount(
  runtime: WalletRuntime,
  session: Session,
  subAccount: SubAccount
) {
  runtime.store.subAccounts.set(subAccount);
  const accounts = orderedEthAccounts(runtime, [
    ...((runtime.store.account.get().accounts ?? []) as Address[]),
    subAccount.address,
  ]);
  runtime.writeSession(
    sessionFromAccounts({
      accounts,
      chainId: runtime.chainId(),
      transportKind: session.transportKind,
    })
  );
  runtime.store.account.set({ accounts });
  runtime.emit?.('accountsChanged', accounts);
  runtime.emit?.('connect', { chainId: numberToHex(runtime.chainId()) });
  return accounts;
}
