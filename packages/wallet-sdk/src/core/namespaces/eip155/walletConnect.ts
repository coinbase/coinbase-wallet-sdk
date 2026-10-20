import type { WalletConnectParams, WalletConnectResult } from ':core/rpc/wallet_connect.js';
import type { Caip25RequestScope } from ':core/rpc/wallet_createSession.js';
import type { Session } from ':core/session/types.js';
import { EIP155_NAMESPACE } from './caip.js';
import { EIP155_METHODS } from './methods.js';
import { activeEip155Grant, projectEthAccounts } from './session.js';

/**
 * The EIP-155 CAIP-25 scopes for one `wallet_connect` request. Capabilities pass through
 * untouched: what they mean is between the dapp and the wallet.
 *
 * One scope, keyed by the bare `eip155` namespace with no chain list. The user consents
 * to accounts and methods, not to a chain list, so nothing here is chain-dependent and
 * switching chains never reconnects.
 *
 * To SCW, that missing chain list means every EVM chain it supports. That reading is an
 * SDK↔SCW agreement rather than a spec guarantee: CAIP-217 reads an absent chain list as
 * zero chains, so a wallet going by the letter of the spec grants nothing. That case is
 * safe — callers throw on a grant with no accounts instead of quietly continuing with a
 * narrowed session.
 */
export function walletConnectToCaip25Scopes([
  { version, capabilities },
]: WalletConnectParams): Record<string, Caip25RequestScope> {
  return {
    [EIP155_NAMESPACE]: {
      methods: [...EIP155_METHODS],
      notifications: ['accountsChanged', 'chainChanged'],
      ...(capabilities ? { capabilities } : {}),
      version,
    },
  };
}

/**
 * The `wallet_connect` result for a granted session: each account with its own answers from
 * `accountCapabilities`. The grant's `capabilities` hold for the whole namespace; they are
 * reported by `wallet_getCapabilities`, never as an account's connect answers.
 *
 * Accounts go through the same `isAddress` filter as `eth_accounts`, so a malformed wallet
 * grant cannot surface a non-address here and then vanish from later reads.
 */
export function sessionToWalletConnectResult(session: Session): WalletConnectResult {
  const grant = activeEip155Grant(session);
  if (!grant) return { accounts: [] };
  return {
    accounts: projectEthAccounts(session).map((address) => {
      const capabilities = grant.accountCapabilities?.[address];
      return { address, ...(capabilities ? { capabilities } : {}) };
    }),
  };
}
