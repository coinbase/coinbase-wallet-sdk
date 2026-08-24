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
} from './caip.js';
import type { Session, TransportKind } from './types.js';

/** Methods recorded on an eip155 session scope after `wallet_connect`. */
export const EIP155_METHODS = [
  'personal_sign',
  'eth_sendTransaction',
  'eth_signTransaction',
  'eth_signTypedData',
  'eth_signTypedData_v1',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'wallet_sendCalls',
  'wallet_sign',
] as const;

/**
 * Build a Session from a flat eip155 address list.
 *
 * Used after `wallet_connect` (`ingestConnectResult`) and when hydrating from
 * the legacy `account.accounts` store (no `session` slice yet).
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

/** Copy eip155 accounts onto a new chain id without changing the address list. */
export function withEip155Chain(session: Session, chainId: number): Session {
  const nextId = eip155Caip2(chainId);
  const source =
    session.scopes[nextId] ??
    Object.entries(session.scopes).find(([id]) => namespaceOf(id) === 'eip155')?.[1];
  const accounts = (source?.accounts ?? []).map((account) =>
    formatEip155Account(chainId, accountOf(account) as Address)
  );
  const selected = session.selected.eip155
    ? formatEip155Account(chainId, accountOf(session.selected.eip155) as Address)
    : accounts[0];

  return {
    ...session,
    scopes: {
      ...session.scopes,
      [nextId]: { accounts, methods: source?.methods ?? [...EIP155_METHODS] },
    },
    selected: { ...session.selected, ...(selected ? { eip155: selected } : {}) },
  };
}
