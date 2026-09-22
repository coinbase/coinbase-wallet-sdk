/**
 * Session kernel.
 *
 * A **session** is the noun: the persisted fact of being paired with a wallet
 * (which accounts and methods the wallet granted). Never persist transport delivery.
 *
 * **createSession** and **invoke** are the only verbs:
 * - `createSession` — no session (or scopes do not cover the request): handshake +
 *   CAIP-25 `wallet_createSession`, then write a Session.
 * - `invoke` — already paired: send one envelope on the existing session.
 *
 * `sessionCovers` is the gate in front of `createSession`: reuse the stored session when
 * it already covers the required CAIP-2 chains and methods.
 *
 * Namespace adapters and transports sit around this kernel:
 * dapp request → CAIP JSON-RPC → transport.request → translator response unwrapping.
 */
export {
  activeGrantForChain,
  activeGrantForNamespace,
  activeSession,
  sessionCovers,
} from './grants.js';
export {
  accountOf,
  formatCaip10,
  formatCaip2,
  isCaip10,
  isCaip2,
  namespaceOf,
  parseCaip2,
} from './caip.js';
export type { Caip10, Caip2, ParsedCaip2 } from './caip.js';
export {
  WALLET_CREATE_SESSION,
  createCaip25Request,
  parseCaip25Request,
  parseCaip25Result,
  sessionFromCaip25Result,
} from './caip25.js';
export { createSession } from './createSession.js';
export { WALLET_INVOKE_METHOD, createCaip27Request, readCaip27Result } from './caip27.js';
export type {
  Caip25PrivateRequestScopeExtensions,
  Caip25PrivateScopeParams,
  Caip25RequestParams,
  Caip25RequestScope,
  Caip25Result,
  Caip25ResultScope,
  Caip27Error,
  Caip27Params,
  Caip27Request,
  Envelope,
  NamespaceTranslator,
  ScopeState,
  Session,
} from './types.js';
