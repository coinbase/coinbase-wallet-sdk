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
 * `ensureSession` is the gate in front of `createSession` (reuse the stored session when
 * it already covers the required CAIP-2 chains).
 *
 * Namespace adapters and transports sit around this kernel:
 * dapp request → CAIP JSON-RPC → transport.request → translator response unwrapping.
 */
export { activeSession } from './activeSession.js';
export {
  accountOf,
  chainIdOf,
  formatCaip10,
  formatCaip2,
  isCaip10,
  isCaip2,
  namespaceOf,
  parseCaip10,
  parseCaip2,
} from './caip.js';
export type { Caip10, Caip2, ParsedCaip10, ParsedCaip2 } from './caip.js';
export {
  WALLET_CREATE_SESSION,
  createCaip25Request,
  parseCaip25Request,
  parseCaip25Result,
  sessionFromCaip25Result,
} from './caip25.js';
export type {
  Caip25PrivateRequestScopeExtensions,
  Caip25PrivateScopeParams,
  Caip25Request,
  Caip25RequestParams,
  Caip25RequestScope,
  Caip25Result,
  Caip25ResultScope,
} from './caip25.js';
export {
  accountsFor,
  grantFor,
  grantsInNamespace,
  hasNamespaceGrant,
  scopeNamespace,
} from './grants.js';
export { createSession } from './createSession.js';
export type { CreateSessionOptions } from './createSession.js';
export { ensureSession } from './ensureSession.js';
export {
  WALLET_INVOKE_METHOD,
  assertInvokeAuthorized,
  createCaip27Request,
  parseCaip27Response,
  toCaip27,
  unwrapCaip27Response,
} from './caip27.js';
export { sessionCovers } from './covers.js';
export type { ScopeRequirement } from './covers.js';
export type {
  Caip27Error,
  Caip27Params,
  Caip27Request,
  Caip27Response,
  Caip27Result,
  Envelope,
  NamespaceTranslator,
  ScopeState,
  Session,
} from './types.js';
