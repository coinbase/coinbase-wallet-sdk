/**
 * Sub-account fork — not a transport.
 *
 * If `from` is the cached sub-account, connected EIP-1193 calls
 * `dispatchSubAccount` instead of `invoke` on that address. Local `:owner-key`
 * signs UserOperations. Funding and add-owner still `invoke` the **global**
 * account on the wallet transport (`sendViaWallet`).
 */
export { orderedEthAccounts, persistSubAccount } from './accounts.js';
export { addSubAccount } from './add.js';
export { getSubAccounts } from './get.js';
export { dispatchSubAccount, shouldUseSubAccount } from './dispatch.js';
