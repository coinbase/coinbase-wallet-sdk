import type { Eip1193Context } from '../context.js';
import type { Session } from ':core/session/index.js';
import type { Address } from ':core/type/index.js';
import type { Store, SubAccount } from ':store/store.js';
import { numberToHex } from 'viem';
import { projectEthAccountsForChain, withEip155Accounts } from '../../session.js';
import { appendWithoutDuplicates, prependWithoutDuplicates } from './utils.js';

/**
 * EIP-1193 accounts with the sub-account first or last based on `defaultAccount`.
 */
export function orderedEthAccounts(store: Store['eip155'], accounts: Address[]): Address[] {
  const sub = store.subAccounts.get()?.address;
  if (!sub) return accounts;
  return store.subAccountsConfig.get()?.defaultAccount === 'sub'
    ? prependWithoutDuplicates(accounts, sub)
    : appendWithoutDuplicates(accounts, sub);
}

/**
 * Persist a sub-account on the store + session and emit `accountsChanged`.
 * Called from `ingestConnectResult` (on-connect) and `addSubAccount`.
 */
export function persistSubAccount(
  context: Eip1193Context,
  session: Session,
  subAccount: SubAccount,
  chainId = context.chain.get()
) {
  const { transport, cache, emit } = context;
  cache.subAccounts.set(subAccount);
  const accounts = orderedEthAccounts(cache, [
    ...projectEthAccountsForChain(session, chainId),
    subAccount.address,
  ]);
  transport.writeSession(withEip155Accounts(session, chainId, accounts));
  emit('accountsChanged', accounts);
  emit('connect', { chainId: numberToHex(chainId) });
  return accounts;
}
