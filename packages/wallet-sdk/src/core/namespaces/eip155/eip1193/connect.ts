import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import { isRecord } from ':util/wire.js';
import { createSession } from ':core/session/createSession.js';
import { EIP155_METHODS } from '../methods.js';
import { activeEip155Grant, projectEthAccounts } from '../session.js';
import type {
  Caip25PrivateRequestScopeExtensions,
  Caip25RequestScope,
  Session,
} from ':core/session/types.js';
import type { Address } from ':core/type/index.js';
import { numberToHex } from 'viem';
import { EIP155_NAMESPACE } from '../caip.js';
import type { Eip1193Context } from './context.js';

export type ConnectResult = {
  accounts: {
    address: Address;
    capabilities?: Record<string, unknown>;
  }[];
};

/**
 * Build the EIP-155 CAIP-25 scope, including private wallet_connect fields.
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
export function createEip155Scopes(opts: {
  methods: readonly string[];
  requestParts: Caip25PrivateRequestScopeExtensions;
}): Record<string, Caip25RequestScope> {
  return {
    [EIP155_NAMESPACE]: {
      methods: [...new Set(opts.methods)],
      notifications: ['accountsChanged', 'chainChanged'],
      ...(opts.requestParts.capabilities ? { capabilities: opts.requestParts.capabilities } : {}),
      params: [{ ...opts.requestParts.params[0] }],
    },
  };
}

/**
 * Split dapp-facing `wallet_connect` params into the EIP-155 CAIP-25 scope extension.
 */
export function walletConnectScopeRequestParts(
  request?: RequestArguments,
  injected: Record<string, unknown> = {}
): Caip25PrivateRequestScopeExtensions {
  const first = Array.isArray(request?.params) ? request.params[0] : undefined;
  const value = isRecord(first) ? first : {};
  const version =
    typeof value.version === 'string' && value.version.length > 0 ? value.version : '1';
  const dappCapabilities = isRecord(value.capabilities) ? value.capabilities : {};
  const capabilities = { ...injected, ...dappCapabilities };
  const params: { version: string; [key: string]: unknown } = { ...value, version };
  delete params.capabilities;

  return Object.keys(capabilities).length === 0
    ? { params: [params] }
    : { capabilities, params: [params] };
}

export type ConnectEip155Options = {
  sessionId?: string;
};

/**
 * Translate `wallet_connect` into CAIP-25 and map its authoritative grant back to ERC-7846.
 */
export async function connectEip155(
  context: Eip1193Context,
  request?: RequestArguments,
  options: ConnectEip155Options = {}
): Promise<{ session: Session; result: ConnectResult }> {
  const { transport, emit, chain } = context;
  const session = await createSession(transport, {
    scopes: createEip155Scopes({
      methods: EIP155_METHODS,
      requestParts: walletConnectScopeRequestParts(request),
    }),
    ...(options.sessionId ? { sessionId: options.sessionId } : {}),
  });

  // Projected through the same `isAddress` filter as `eth_accounts`, so a malformed
  // wallet grant cannot surface a non-address here and then vanish from later reads.
  const accounts = projectEthAccounts(session);
  if (accounts.length === 0) {
    throw standardErrors.provider.unauthorized('wallet_createSession granted no eip155 accounts');
  }
  const capabilities = activeEip155Grant(session)?.capabilities;

  // The grant covers every EVM chain, so the connect event reports the chain the
  // provider is already on rather than one the wallet chose.
  emit('accountsChanged', accounts);
  emit('connect', { chainId: numberToHex(chain.get()) });

  return {
    session,
    result: {
      accounts: accounts.map((address) => ({ address, ...(capabilities ? { capabilities } : {}) })),
    },
  };
}
