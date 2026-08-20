import type { Caip2, Caip10 } from './caip.js';

/**
 * How envelopes reach the wallet. Only this string is stored on `Session`.
 * Implementations: `core/transport/popup` today; `walletlink2` / `injected` later.
 */
export type TransportKind = 'popup' | 'walletlink2' | 'injected';

/** Accounts and methods granted for one CAIP-2 chain (one key in `Session.scopes`). */
export type ScopeState = {
  accounts: Caip10[];
  methods: string[];
};

/**
 * Persisted pairing with a wallet. This is the kernel noun.
 *
 * - `scopes` — per CAIP-2 chain (`eip155:8453`): which CAIP-10 accounts and methods
 * - `selected` — active account per namespace (`eip155` → one CAIP-10)
 * - `transportKind` — which delivery path was used (`popup`, later `walletlink2`)
 *
 * Reload hydrates this from the store. Do not persist `send`, a popup handle,
 * or a communicator — those live on `WalletRuntime` only for the page lifetime.
 */
export type Session = {
  scopes: Record<Caip2, ScopeState>;
  selected: Partial<Record<string, Caip10>>;
  transportKind: TransportKind;
};

/**
 * Nested JSON-RPC body inside CAIP-27 `wallet_invokeMethod` params.
 * Spec: `params` is required and may be empty.
 */
export type Caip27Request = {
  method: string;
  params?: readonly unknown[] | object;
};

/**
 * CAIP-27 `wallet_invokeMethod` params (`chainId` + `request`).
 *
 * MetaMask MIP-5 uses `scope` for the same CAIP-2 string; `parseCaip27`
 * accepts either. `sessionId` (CAIP-171) is stored if the dapp sends it;
 * this SDK does not issue session ids yet.
 *
 * This is **not** the popup wire format. Keys protocol v1 still encrypts
 * `{ action: { method, params }, chainId: number }`. Use `toCaip27` when
 * keys ingest `protocolVersion: 2`.
 */
export type Caip27Params = {
  chainId: Caip2;
  request: Caip27Request;
  capabilities?: Record<string, unknown>;
  sessionId?: string;
};

/**
 * Kernel request after the namespace adapter has run.
 *
 * Same shape as CAIP-27 params. The signer stays inside `request.params`
 * (e.g. `eth_sendTransaction.from`); eip155 `qualify` reads it from there.
 */
export type Envelope = Caip27Params;

/**
 * Delivery of envelopes to a wallet. `kind` is persisted; `send` is not.
 *
 * `invoke(session, envelope, transport)` is the only kernel caller of `send`.
 * Pairing uses `WalletRuntime.handshake` / `.send` (JSON-RPC) instead, because
 * handshake is plaintext key exchange, not an envelope.
 */
export type Transport = {
  kind: TransportKind;
  send: (envelope: Envelope) => Promise<unknown>;
};
