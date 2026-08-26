import type { Caip2, Caip10, Namespace } from './caip.js';

/**
 * How envelopes reach the wallet. Only this string is stored on `Session`.
 * Implementations: `core/transport/popup` today; `walletlink2` / `injected` later.
 */
export type TransportKind = 'popup' | 'walletlink2' | 'injected';

/** Accounts and methods granted for one CAIP-2 chain (one key in `Session.scopes`). */
export type ScopeState = {
  accounts: Caip10[];
  methods: string[];
  capabilities?: Record<string, unknown>;
};

/**
 * Persisted pairing with a wallet. This is the kernel noun.
 *
 * - `scopes` — per CAIP-2 chain (`eip155:8453`): which CAIP-10 accounts and methods
 * - `selected` — active account per namespace (`eip155` → one CAIP-10)
 * - `sessionId` — CAIP-171 id issued by the wallet, when present
 * - `transportKind` — which delivery path was used (`popup`, later `walletlink2`)
 *
 * Reload hydrates this from the store. Do not persist `send`, a popup handle,
 * or a communicator — those live on `WalletRuntime` only for the page lifetime.
 */
export type Session = {
  sessionId?: string;
  scopes: Record<Caip2, ScopeState>;
  selected: Partial<Record<Namespace, Caip10>>;
  transportKind: TransportKind;
};

/**
 * Nested JSON-RPC body inside CAIP-27 `wallet_invokeMethod` params.
 * Spec: `params` is required and may be empty.
 */
export type Caip27Request = {
  method: string;
  params: readonly unknown[] | object;
};

/**
 * CAIP-27 `wallet_invokeMethod` params (`chainId` + `request`).
 *
 * `sessionId` is included whenever the CAIP-25 response issued one.
 */
export type Caip27Params = {
  chainId: Caip2;
  request: Caip27Request;
  capabilities?: Record<string, unknown>;
  sessionId?: string;
};

export type Caip27Result = {
  method: string;
  result: unknown;
};

export type Caip27Error = {
  code: number;
  message: string;
  data?: unknown;
};

export type Caip27Response =
  | {
      sessionId?: string;
      chainId: Caip2;
      result: Caip27Result;
    }
  | {
      sessionId?: string;
      chainId: Caip2;
      error: Caip27Error;
    };

/**
 * Kernel request after the namespace adapter has run.
 *
 * Same shape as CAIP-27 params. The signer stays inside `request.params`
 * (e.g. `eth_sendTransaction.from`); eip155 `qualify` reads it from there.
 */
export type Envelope = Caip27Params;

/**
 * Namespace-neutral delivery of envelopes to a wallet. `kind` is persisted;
 * `send` is not. The response stays opaque until the selected namespace
 * translator validates and unwraps it.
 *
 * `invoke(session, envelope, transport)` is the only kernel caller of `send`.
 * Pairing uses `WalletRuntime.handshake` / `.send` (JSON-RPC) instead, because
 * handshake is plaintext key exchange, not an envelope.
 */
export type Transport = {
  kind: TransportKind;
  send: (envelope: Envelope) => Promise<unknown>;
};
