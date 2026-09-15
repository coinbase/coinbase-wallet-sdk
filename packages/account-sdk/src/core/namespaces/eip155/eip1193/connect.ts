import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { type Caip2, parseCaip2 } from ':core/session/caip.js';
import {
  type Caip25PrivateRequestScopeExtensions,
  type Caip25RequestScope,
} from ':core/session/caip25.js';
import { createSession } from ':core/session/createSession.js';
import { grantFor } from ':core/session/grants.js';
import { EIP155_METHODS, projectEthAccountsForChain } from '../session.js';
import type { Session } from ':core/session/types.js';
import { persistSubAccount } from './sub-account/accounts.js';
import { initSubAccountConfig } from './sub-account/utils.js';
import type { Address } from ':core/type/index.js';
import { assertSubAccount } from ':util/assertSubAccount.js';
import { numberToHex } from 'viem';
import { eip155Caip2, eip155ChainId } from '../caip.js';
import type { Eip1193Context } from './context.js';

export type ConnectResult = {
  accounts: {
    address: Address;
    capabilities?: Record<string, unknown>;
  }[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Build the EIP-155 CAIP-25 scope, including private wallet_connect fields.
 */
export function createEip155Scopes(opts: {
  chainId: Caip2;
  methods: readonly string[];
  requestParts: Caip25PrivateRequestScopeExtensions;
}): Record<'eip155', Caip25RequestScope> {
  const parsed = parseCaip2(opts.chainId);
  const numericChainId = parsed ? Number(parsed.reference) : Number.NaN;
  if (
    !parsed ||
    parsed.namespace !== 'eip155' ||
    !/^[1-9]\d*$/.test(parsed.reference) ||
    !Number.isSafeInteger(numericChainId) ||
    String(numericChainId) !== parsed.reference
  ) {
    throw standardErrors.provider.unsupportedChain(`Unsupported CAIP-25 chain ${opts.chainId}`);
  }

  return {
    eip155: {
      chains: [parsed.reference],
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

/**
 * Project one granted EIP-155 scope into the dapp-facing ERC-7846 result.
 *
 * Projected through the same `isAddress` filter as `eth_accounts` so a malformed
 * wallet grant cannot surface a non-address here and then disappear from later reads.
 * `connectEip155` rejects the connect when this leaves no accounts.
 */
function connectResultFromSession(session: Session, chainId: Caip2): ConnectResult {
  const scope = grantFor(session, chainId);
  const numericChainId = eip155ChainId(chainId);
  const addresses =
    numericChainId === null ? [] : projectEthAccountsForChain(session, numericChainId);
  return {
    accounts: addresses.map((address) => ({
      address,
      ...(scope?.capabilities ? { capabilities: scope.capabilities } : {}),
    })),
  };
}

/**
 * Ingest non-session caches and emit EIP-1193 connection events.
 */
function ingestConnectResult(
  context: Eip1193Context,
  session: Session,
  value: ConnectResult,
  targetChainId: Caip2
): Session {
  const { transport, cache, emit } = context;
  const chainId = eip155ChainId(targetChainId);
  if (chainId === null) {
    throw standardErrors.provider.unsupportedChain(
      `Unsupported wallet_connect chain: ${targetChainId}`
    );
  }

  const granted = value.accounts[0]?.capabilities;

  const spend = granted?.spendPermissions;
  if (isRecord(spend) && Array.isArray(spend.permissions) && spend.permissions.every(isRecord)) {
    cache.spendPermissions.set(spend.permissions as SpendPermission[]);
  }

  const subAccounts = granted?.subAccounts;
  if (Array.isArray(subAccounts) && subAccounts[0]) {
    assertSubAccount(subAccounts[0]);
    persistSubAccount(
      context,
      session,
      {
        address: subAccounts[0].address,
        factory: subAccounts[0].factory,
        factoryData: subAccounts[0].factoryData,
      },
      chainId
    );
    return transport.readSession() ?? session;
  }

  emit('accountsChanged', projectEthAccountsForChain(session, chainId));
  emit('connect', { chainId: numberToHex(chainId) });
  return session;
}

export type ConnectEip155Options = {
  chainId?: Caip2;
  methods?: readonly string[];
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
  const { transport, cache, chain } = context;
  await initSubAccountConfig(cache.subAccountsConfig);
  const injected = cache.subAccountsConfig.get()?.capabilities ?? {};
  const chainId = options.chainId ?? eip155Caip2(chain.get());
  const scopes = createEip155Scopes({
    chainId,
    methods: options.methods ?? EIP155_METHODS,
    requestParts: walletConnectScopeRequestParts(request, injected),
  });
  const grantedSession = await createSession(transport, {
    scopes,
    ...(options.sessionId ? { sessionId: options.sessionId } : {}),
  });
  const result = connectResultFromSession(grantedSession, chainId);
  if (result.accounts.length === 0) {
    throw standardErrors.provider.unauthorized(
      `wallet_createSession did not grant accounts for ${chainId}`
    );
  }
  return {
    session: ingestConnectResult(context, grantedSession, result, chainId),
    result,
  };
}
