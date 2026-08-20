import type { Popup } from ':core/popup/types.js';
import type { Session } from ':core/session/index.js';
import { sessionFromAccounts } from ':core/session/index.js';
import type { Address } from ':core/type/index.js';
import type { SubAccount } from ':store/store.js';
import { numberToHex } from 'viem';
import { appendWithoutDuplicates, prependWithoutDuplicates } from './utils.js';

/**
 * EIP-1193 accounts with the sub-account first or last based on `defaultAccount`.
 */
export function orderedEthAccounts(runtime: Popup, accounts: Address[]): Address[] {
  const sub = runtime.helpers.subAccounts.get()?.address;
  if (!sub) return accounts;
  return runtime.helpers.subAccountsConfig.get()?.defaultAccount === 'sub'
    ? prependWithoutDuplicates(accounts, sub)
    : appendWithoutDuplicates(accounts, sub);
}

/**
 * Persist a sub-account on the store + session and emit `accountsChanged`.
 */
export function persistSubAccount(runtime: Popup, session: Session, subAccount: SubAccount) {
  runtime.helpers.subAccounts.set(subAccount);
  const accounts = orderedEthAccounts(runtime, [
    ...((runtime.helpers.account.get().accounts ?? []) as Address[]),
    subAccount.address,
  ]);
  runtime.writeSession(
    sessionFromAccounts({
      accounts,
      chainId: runtime.chainId(),
      transportKind: session.transportKind,
    })
  );
  runtime.helpers.account.set({ accounts });
  runtime.emit?.('accountsChanged', accounts);
  runtime.emit?.('connect', { chainId: numberToHex(runtime.chainId()) });
  return accounts;
}
