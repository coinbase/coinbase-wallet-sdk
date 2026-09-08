import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { persistSubAccount } from ':core/namespaces/eip155/eip1193/sub-account/accounts.js';
import { initSubAccountConfig } from ':core/namespaces/eip155/eip1193/sub-account/utils.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import type { WalletRuntime } from ':core/transport/index.js';
import { Address } from ':core/type/index.js';
import { assertSubAccount } from ':util/assertSubAccount.js';
import { numberToHex } from 'viem';
import {
  EIP155_METHODS,
  projectEthAccounts,
  sessionFromAccounts,
  withEip155Accounts,
} from '../namespaces/eip155/session.js';
import { type Caip2, eip155Caip2, eip155ChainId } from './caip.js';
import {
  type Caip25ConnectResult,
  type Caip25PrivateRequestScopeExtensions,
  connectResultFromSession,
  createCaip25Request,
  sessionFromCaip25Result,
} from './caip25.js';
import type { PairResult } from './ensureSession.js';
import type { Caip27Request, Session } from './types.js';

export type ConnectResult = Caip25ConnectResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isUnauthorized(error: unknown): boolean {
  return isRecord(error) && error.code === standardErrorCodes.provider.unauthorized;
}

/**
 * Split wallet_connect params into the private CAIP-25 scope request fields.
 *
 * Merges SDK-injected capabilities (e.g. `addSubAccount` when `creation: 'on-connect'`)
 * with dapp capabilities. Dapp capabilities win on key conflict. The original
 * params object is preserved apart from moving `capabilities` onto the scope,
 * because this private wire extension keeps them separate.
 */
export function walletConnectScopeRequestParts(
  request?: RequestArguments,
  injected: Record<string, unknown> = {}
): Caip25PrivateRequestScopeExtensions {
  const first = Array.isArray(request?.params) ? request.params[0] : undefined;
  const obj = isRecord(first) ? first : {};
  const version = typeof obj.version === 'string' && obj.version.length > 0 ? obj.version : '1';
  const dappCaps = isRecord(obj.capabilities) ? obj.capabilities : {};
  const capabilities = { ...injected, ...dappCaps };
  const params: { version: string; [key: string]: unknown } = { ...obj, version };
  delete params.capabilities;
  if (Object.keys(capabilities).length === 0) {
    return { params: [params] };
  }
  return { capabilities, params: [params] };
}

/**
 * Rebuild the public ERC-7846 wallet_connect shape for a CAIP-27 inner request.
 *
 * Unlike the private CAIP-25 extension, ERC-7846 keeps capabilities nested in
 * params, so direct invocation must put the split request parts back together.
 */
export function walletConnectParams(
  request?: RequestArguments,
  injected: Record<string, unknown> = {}
): [{ version: string; [key: string]: unknown }] {
  const parts = walletConnectScopeRequestParts(request, injected);
  return [
    {
      ...parts.params[0],
      ...(parts.capabilities ? { capabilities: parts.capabilities } : {}),
    },
  ];
}

/** Apply SDK-owned capabilities to a CAIP-27 inner `wallet_connect` request. */
export async function prepareWalletConnectRequest(
  runtime: WalletRuntime,
  request: RequestArguments
): Promise<Caip27Request> {
  await initSubAccountConfig(runtime.store);
  const injected = runtime.store.subAccountsConfig.get()?.capabilities ?? {};
  return { method: request.method, params: walletConnectParams(request, injected) };
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
export function ingestConnectResult(
  runtime: WalletRuntime,
  value: ConnectResult,
  baseSession?: Session,
  targetChainId: Caip2 = eip155Caip2(runtime.chainId())
) {
  const chainId = eip155ChainId(targetChainId);
  if (chainId === null) {
    throw standardErrors.provider.unsupportedChain(
      `Unsupported wallet_connect chain: ${targetChainId}`
    );
  }
  const granted = value.accounts[0]?.capabilities;
  const addresses = value.accounts.map((account) => account.address as Address);
  const current =
    baseSession ?? runtime.readSession() ?? sessionFromAccounts({ accounts: addresses, chainId });
  const session = withEip155Accounts(current, chainId, addresses);
  const chain =
    runtime.store.chains.get().find((candidate) => candidate.id === chainId) ??
    ({ id: chainId } as ReturnType<typeof runtime.store.account.get>['chain']);

  // --- EIP-1193 account slice (legacy store used by eth_accounts) ---
  // Accounts only — do not overwrite handshake EIP-5792 `account.capabilities`.
  // SIWE / spend / subAccounts live on the connect result and the slices below.
  runtime.store.account.set({
    accounts: addresses,
    chain,
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
      session,
      {
        address: subAccounts[0].address,
        factory: subAccounts[0].factory,
        factoryData: subAccounts[0].factoryData,
      },
      chainId
    );
    return runtime.readSession() ?? session;
  }

  runtime.writeSession(session);
  runtime.emit?.('accountsChanged', projectEthAccounts(session));
  runtime.emit?.('connect', { chainId: numberToHex(chainId) });
  return session;
}

/**
 * Create a session: handshake, then CAIP-25 `wallet_createSession`, then persist.
 *
 * This is the kernel **pair** verb. Call it when there is no session (or
 * `ensureSession` decided the stored scopes are not enough). It does not send
 * dapp method calls — that is `invoke`.
 *
 * CAIP-25 is a session-control RPC, so it uses `runtime.send(RequestArguments)`
 * directly. `transport.send(Envelope)` is reserved for CAIP-27 invocations.
 *
 * Steps:
 * 1. `handshake` — ECDH public-key exchange (plaintext) for a new session only.
 *    Scope updates reuse the restored keys for the persisted `sessionId`.
 * 2. Inject `addSubAccount` when `creation: 'on-connect'`.
 * 3. Encrypted `wallet_createSession`; wallet_connect params and capabilities
 *    use the private Coinbase request-scope extension.
 * 4. Strictly parse granted scopes and convert raw addresses to CAIP-10.
 * 5. Project the result back to the dapp-facing ERC-7846 `accounts[]`.
 */
export async function pair(
  runtime: WalletRuntime,
  request?: RequestArguments,
  required?: {
    chainId?: Caip2;
    methods?: readonly string[];
    sessionId?: string;
  }
): Promise<PairResult> {
  const persisted = runtime.readSession();
  // An explicit update target wins; the store may have changed since the caller read its session.
  const sessionId = required?.sessionId ?? persisted?.sessionId;
  const canReusePersistedKeys = !!persisted?.sessionId && persisted.sessionId === sessionId;

  // Matching ids mean the restored ECDH keys belong to the session being extended.
  if (!canReusePersistedKeys) {
    await runtime.handshake({ method: 'handshake' });
  }

  // Materialize configured sub-account intent before composing the wallet-owned grant request.
  await initSubAccountConfig(runtime.store);
  const injected = runtime.store.subAccountsConfig.get()?.capabilities ?? {};

  const chainId = required?.chainId ?? eip155Caip2(runtime.chainId());
  const createSession = createCaip25Request({
    chainId,
    methods: required?.methods ?? EIP155_METHODS,
    requestParts: walletConnectScopeRequestParts(request, injected),
    sessionId,
  });
  let rawResult: unknown;
  try {
    rawResult = await runtime.send(createSession);
  } catch (error) {
    // Only 4100 means SCW forgot this authorization; other failures are not stale-session signals.
    if (!canReusePersistedKeys || !isUnauthorized(error)) throw error;

    // Retry without the stale id so SCW creates a new session instead of extending the missing one.
    await runtime.handshake({ method: 'handshake' });
    rawResult = await runtime.send(
      createCaip25Request({
        chainId,
        methods: required?.methods ?? EIP155_METHODS,
        requestParts: walletConnectScopeRequestParts(request, injected),
      })
    );
  }

  // Requested scopes are intent; only the wallet response is authoritative authorization state.
  const grantedSession = sessionFromCaip25Result(rawResult, {
    preferredChainId: chainId,
    transportKind: runtime.transport.kind,
  });
  const result = connectResultFromSession(grantedSession, chainId);
  if (!isConnectResult(result) || result.accounts.length === 0) {
    throw standardErrors.provider.unauthorized(
      `wallet_createSession did not grant accounts for ${chainId}`
    );
  }
  return {
    session: ingestConnectResult(runtime, result, grantedSession, chainId),
    result,
  };
}
