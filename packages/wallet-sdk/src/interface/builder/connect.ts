import { standardErrors } from ':core/error/errors.js';
import { serialize } from ':core/error/utils.js';
import { EIP155_NAMESPACE } from ':core/namespaces/eip155/caip.js';
import { createEip155Scopes } from ':core/namespaces/eip155/eip1193/connect.js';
import { EIP155_METHODS } from ':core/namespaces/eip155/methods.js';
import { projectEthAccounts } from ':core/namespaces/eip155/session.js';
import { SOLANA_NAMESPACE } from ':core/namespaces/solana/caip.js';
import {
  SOLANA_MAINNET_REQUIRED_SCOPES,
  createSolanaMainnetScopes,
  projectSolanaAccounts,
} from ':core/namespaces/solana/index.js';
import { createSession } from ':core/session/createSession.js';
import { activeGrantForNamespace, activeSession, sessionCovers } from ':core/session/grants.js';
import type { Session } from ':core/session/types.js';
import type { WalletTransport } from ':core/transport/index.js';

export type ConnectNamespaceOptions =
  | true
  | {
      capabilities?: Record<string, unknown>;
    };

export type ConnectOptions = Record<string, ConnectNamespaceOptions>;

export type ConnectAccount = {
  address: string;
  capabilities?: Record<string, unknown>;
};

export type ConnectResult = Record<
  string,
  {
    accounts: ConnectAccount[];
  }
>;

const EVM_CONNECT_METHODS = EIP155_METHODS.filter((method) => method !== 'wallet_addSubAccount');
const UNSUPPORTED_EVM_CONNECT_CAPABILITIES = new Set(['addSubAccount', 'spendPermissions']);

export function requestedCapabilities(
  selection: ConnectNamespaceOptions | undefined
): Record<string, unknown> | undefined {
  const capabilities = selection === true ? undefined : selection?.capabilities;
  return capabilities && Object.keys(capabilities).length > 0 ? { ...capabilities } : undefined;
}

export function forwardedEvmCapabilities(
  requested: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!requested) return undefined;
  const entries = Object.entries(requested).filter(
    ([key]) => !UNSUPPORTED_EVM_CONNECT_CAPABILITIES.has(key)
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function capabilityResults(
  namespace: string,
  requested: Record<string, unknown> | undefined,
  granted: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!requested) return undefined;
  return Object.fromEntries(
    Object.keys(requested).map((key) => {
      const explicitlyUnsupported =
        namespace === 'evm' && UNSUPPORTED_EVM_CONNECT_CAPABILITIES.has(key);
      return [
        key,
        !explicitlyUnsupported && Object.prototype.hasOwnProperty.call(granted ?? {}, key)
          ? granted?.[key]
          : serialize(
              standardErrors.provider.unsupportedMethod(
                `Unsupported capability "${key}" for ${namespace}`
              )
            ),
      ];
    })
  );
}

export function connectAccount(
  namespace: string,
  address: string,
  requested: Record<string, unknown> | undefined,
  granted: Record<string, unknown> | undefined
): ConnectAccount {
  const capabilities = capabilityResults(namespace, requested, granted);
  return {
    address,
    ...(capabilities ? { capabilities } : {}),
  };
}

function projectEvmAccounts(
  session: Session,
  requestedCapabilities: Record<string, unknown> | undefined
): ConnectAccount[] {
  // One namespace grant covers every EVM chain, so the accounts and their capabilities
  // are read once rather than unioned across a chain list.
  const granted = activeGrantForNamespace(session, EIP155_NAMESPACE)?.capabilities;
  return projectEthAccounts(session).map((address) =>
    connectAccount('evm', address, requestedCapabilities, granted)
  );
}

function projectSolanaConnectAccounts(
  session: Session,
  requestedCapabilities: Record<string, unknown> | undefined
): ConnectAccount[] {
  const granted = activeGrantForNamespace(session, SOLANA_NAMESPACE)?.capabilities;
  return projectSolanaAccounts(session).map((address) =>
    connectAccount('solana', address, requestedCapabilities, granted)
  );
}

/** Connect the requested namespaces with one CAIP-25 approval. */
export async function connectWallet({
  request,
  transport,
}: {
  request?: ConnectOptions;
  transport: WalletTransport;
}): Promise<ConnectResult> {
  const namespaces = request ?? { evm: true, solana: true };
  const unsupportedNamespaces = Object.keys(namespaces).filter(
    (namespace) => namespace !== 'evm' && namespace !== 'solana'
  );
  if (unsupportedNamespaces.length > 0) {
    throw standardErrors.rpc.invalidParams(
      `Unsupported wallet namespace: ${unsupportedNamespaces.join(', ')}`
    );
  }

  const includeEvm = namespaces.evm !== undefined;
  const includeSolana = namespaces.solana !== undefined;
  const requestedEvmCapabilities = requestedCapabilities(namespaces.evm);
  const evmCapabilities = forwardedEvmCapabilities(requestedEvmCapabilities);
  const solanaCapabilities = requestedCapabilities(namespaces.solana);

  if (!includeEvm && !includeSolana) {
    throw standardErrors.rpc.invalidParams('At least one wallet namespace must be requested');
  }
  // CAIP-25 connection capabilities are an SDK↔SCW extension the wallet accepts on
  // eip155 scopes only; it rejects the whole session request if one arrives on solana.
  if (solanaCapabilities) {
    throw standardErrors.rpc.invalidParams('Solana does not support connection capabilities');
  }

  const scopes = {
    ...(includeEvm
      ? createEip155Scopes({
          methods: EVM_CONNECT_METHODS,
          requestParts: {
            ...(evmCapabilities ? { capabilities: evmCapabilities } : {}),
            params: [{ version: '1' }],
          },
        })
      : {}),
    ...(includeSolana ? createSolanaMainnetScopes() : {}),
  };
  const currentSession = activeSession(transport.readSession());
  const requestSession = () =>
    createSession(transport, {
      scopes,
      ...(currentSession?.sessionId ? { sessionId: currentSession.sessionId } : {}),
    });

  // A namespace grant has no chain list to check, so EVM coverage is the grant itself
  // carrying the methods this connect asked for.
  const evmGrant = currentSession && activeGrantForNamespace(currentSession, EIP155_NAMESPACE);
  const covered =
    !!currentSession &&
    (!includeEvm ||
      (!!evmGrant &&
        evmGrant.accounts.length > 0 &&
        EVM_CONNECT_METHODS.every((method) => evmGrant.methods.includes(method)))) &&
    (!includeSolana || sessionCovers(currentSession, SOLANA_MAINNET_REQUIRED_SCOPES));

  // Capability requests may contain fresh authentication challenges and must not
  // be answered from a previously persisted session.
  const session =
    requestedEvmCapabilities || !covered || !currentSession
      ? await requestSession()
      : currentSession;

  const result: ConnectResult = {};
  if (includeEvm) {
    result.evm = {
      accounts: projectEvmAccounts(session, requestedEvmCapabilities),
    };
  }
  if (includeSolana) {
    result.solana = {
      accounts: projectSolanaConnectAccounts(session, solanaCapabilities),
    };
  }
  if (!Object.values(result).some(({ accounts }) => accounts.length > 0)) {
    throw standardErrors.provider.unauthorized('Wallet did not grant any requested namespace');
  }
  return result;
}
