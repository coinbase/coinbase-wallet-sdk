import type { Caip2, Caip10 } from './caip.js';

export type TransportKind = 'popup' | 'walletlink2' | 'injected';

export type ScopeState = {
  accounts: Caip10[];
  methods: string[];
};

/** Persisted session. Never store `send`. */
export type Session = {
  scopes: Record<Caip2, ScopeState>;
  selected: Partial<Record<string, Caip10>>;
  transportKind: TransportKind;
};

/** Internal request after namespace adaptation. `from` is a CAIP-10 account. */
export type Envelope = {
  chainId: Caip2;
  method: string;
  params?: readonly unknown[] | object;
  from?: Caip10;
};

/** Transport used to deliver envelopes. Only `kind` is persisted on the session. */
export type Transport = {
  kind: TransportKind;
  send: (envelope: Envelope) => Promise<unknown>;
};
