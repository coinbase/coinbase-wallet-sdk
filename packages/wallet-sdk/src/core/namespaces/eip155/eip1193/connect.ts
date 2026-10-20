import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { WalletConnectResult } from ':core/rpc/wallet_connect.js';
import type { Caip25RequestScope } from ':core/rpc/wallet_createSession.js';
import { createSession } from ':core/session/createSession.js';
import { capabilitiesForAccount } from ':core/session/grants.js';
import type { Session } from ':core/session/types.js';
import { isRecord } from ':util/guards.js';
import { numberToHex } from 'viem';
import { EIP155_NAMESPACE } from '../caip.js';
import { EIP155_METHODS } from '../methods.js';
import { activeEip155Grant, projectEthAccounts } from '../session.js';
import type { Eip1193Context } from './context.js';

/**
 * The EIP-155 CAIP-25 scopes for one `wallet_connect` request, read from its params as the
 * dapp sent them. A missing or empty version defaults to `1`.
 *
 * One scope, keyed by the bare `eip155` namespace with no chain list. The user consents
 * to accounts and methods, not to a chain list, so nothing here is chain-dependent and
 * switching chains never reconnects.
 *
 * To SCW, that missing chain list means every EVM chain it supports. That reading is an
 * SDK↔SCW agreement rather than a spec guarantee: CAIP-217 reads an absent chain list as
 * zero chains, so a wallet going by the letter of the spec grants nothing. That case is
 * safe — `connectEip155` throws on a grant with no accounts instead of quietly
 * continuing with a narrowed session.
 */
export function walletConnectToCaip25Scopes(
  params: RequestArguments['params']
): Record<string, Caip25RequestScope> {
  const first = Array.isArray(params) ? params[0] : undefined;
  const value = isRecord(first) ? first : {};
  const version =
    typeof value.version === 'string' && value.version.length > 0 ? value.version : '1';
  const capabilities =
    isRecord(value.capabilities) && Object.keys(value.capabilities).length > 0
      ? value.capabilities
      : undefined;
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
 * The `wallet_connect` result for a granted session: each account with its own answers.
 *
 * Accounts go through the same `isAddress` filter as `eth_accounts`, so a malformed wallet
 * grant cannot surface a non-address here and then vanish from later reads.
 */
export function sessionToWalletConnectResult(session: Session): WalletConnectResult {
  const grant = activeEip155Grant(session);
  if (!grant) return { accounts: [] };
  return {
    accounts: projectEthAccounts(session).map((address) => {
      const capabilities = capabilitiesForAccount(grant, address);
      return { address, ...(capabilities ? { capabilities } : {}) };
    }),
  };
}

/**
 * Translate `wallet_connect` into CAIP-25 and map its authoritative grant back to ERC-7846.
 */
export async function connectEip155(
  context: Eip1193Context,
  request?: RequestArguments
): Promise<{ session: Session; result: WalletConnectResult }> {
  const { transport, emit, chain } = context;
  const session = await createSession(transport, walletConnectToCaip25Scopes(request?.params));

  const result = sessionToWalletConnectResult(session);
  if (result.accounts.length === 0) {
    throw standardErrors.provider.unauthorized('wallet_createSession granted no eip155 accounts');
  }

  // The grant covers every EVM chain, so the connect event reports the chain the
  // provider is already on rather than one the wallet chose.
  emit(
    'accountsChanged',
    result.accounts.map(({ address }) => address)
  );
  emit('connect', { chainId: numberToHex(chain.get()) });

  return { session, result };
}
