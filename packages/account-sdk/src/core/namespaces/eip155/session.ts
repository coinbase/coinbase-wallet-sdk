import { Address } from ':core/type/index.js';
import {
  type Caip2,
  type Caip10,
  accountOf,
  chainIdOf,
  eip155Caip2,
  eip155ChainId,
  formatEip155Account,
  namespaceOf,
} from '../../session/caip.js';
import type { Session, TransportKind } from '../../session/types.js';

/** Default methods requested in an eip155 CAIP-25 session scope. */
export const EIP155_METHODS = [
  'eth_accounts',
  'personal_sign',
  'personal_ecRecover',
  'eth_ecRecover',
  'eth_sendTransaction',
  'eth_signTransaction',
  'eth_signTypedData',
  'eth_signTypedData_v1',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'wallet_sendCalls',
  'wallet_showCallsStatus',
  'wallet_sign',
  'wallet_grantPermissions',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
  'wallet_watchAsset',
  'wallet_connect',
  'wallet_addSubAccount',
  'experimental_requestInfo',
] as const;

/**
 * Build a Session from a flat eip155 address list.
 *
 * Used for internal test/local state and as a defensive fallback when an
 * ERC-7846 account refresh is ingested without a session.
 */
export function sessionFromAccounts(opts: {
  accounts: Address[];
  chainId: number;
  transportKind?: TransportKind;
}): Session {
  const chainId = eip155Caip2(opts.chainId);
  const accounts = opts.accounts.map((address) => formatEip155Account(opts.chainId, address));
  return {
    scopes: {
      [chainId]: { accounts, methods: [...EIP155_METHODS] },
    },
    selected: accounts[0] ? { eip155: accounts[0] } : {},
    transportKind: opts.transportKind ?? 'popup',
  };
}

/** eip155 addresses only. Solana / bip122 never appear here. */
export function projectEthAccounts(session: Session): Address[] {
  const seen = new Set<string>();
  const addresses: Address[] = [];

  const push = (account: Caip10) => {
    if (namespaceOf(account) !== 'eip155') return;
    const address = accountOf(account) as Address;
    const key = address.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    addresses.push(address);
  };

  if (session.selected.eip155) push(session.selected.eip155);
  for (const [id, scope] of Object.entries(session.scopes)) {
    if (namespaceOf(id) !== 'eip155') continue;
    for (const account of scope.accounts) push(account);
  }
  return addresses;
}

/** Numeric chain id of the selected eip155 account, else the first eip155 scope. */
export function selectedEip155ChainId(session: Session): number | undefined {
  if (session.selected.eip155) {
    const n = eip155ChainId(chainIdOf(session.selected.eip155));
    if (n !== null) return n;
  }
  for (const id of Object.keys(session.scopes)) {
    const n = eip155ChainId(id as Caip2);
    if (n !== null) return n;
  }
  return undefined;
}

/** Select an already-authorized eip155 chain without fabricating a new grant. */
export function withEip155Chain(session: Session, chainId: number): Session {
  const nextId = eip155Caip2(chainId);
  const accounts = session.scopes[nextId]?.accounts ?? [];
  const selected = session.selected.eip155
    ? (accounts.find(
        (account) =>
          accountOf(account).toLowerCase() ===
          accountOf(session.selected.eip155 as Caip10).toLowerCase()
      ) ?? accounts[0])
    : accounts[0];

  return {
    ...session,
    selected: { ...session.selected, ...(selected ? { eip155: selected } : {}) },
  };
}

/** Replace accounts on one granted scope while preserving methods, capabilities, and session id. */
export function withEip155Accounts(
  session: Session,
  chainId: number,
  addresses: Address[]
): Session {
  const id = eip155Caip2(chainId);
  const scope = session.scopes[id];
  if (!scope) return session;
  const accounts = addresses.map((address) => formatEip155Account(chainId, address));
  return {
    ...session,
    scopes: {
      ...session.scopes,
      [id]: { ...scope, accounts },
    },
    selected: {
      ...session.selected,
      ...(accounts[0] ? { eip155: accounts[0] } : {}),
    },
  };
}
