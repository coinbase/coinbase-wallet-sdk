/**
 * Session kernel.
 *
 * A **session** is the noun: the persisted fact of being paired with a wallet
 * (which accounts, which methods, which transport kind). Never persist `send`.
 *
 * **pair** and **invoke** are the only verbs:
 * - `pair` — no session (or scopes do not cover the request): handshake +
 *   `wallet_connect`, then write a Session.
 * - `invoke` — already paired: send one envelope on the existing session.
 *
 * `ensureSession` is the gate in front of `pair` (reuse the stored session when
 * it already covers the required CAIP-2 chains).
 *
 * Interfaces, translators, and transports sit around this kernel:
 * dapp request → CAIP-27 envelope → transport.send. Sub-account signing is a
 * fork off invoke (local owner keys), not a fourth edge.
 */
export {
  BITCOIN_MAINNET,
  SOLANA_MAINNET,
  accountOf,
  chainIdOf,
  eip155Caip2,
  eip155ChainId,
  formatCaip10,
  formatCaip2,
  formatEip155Account,
  isCaip10,
  isCaip2,
  namespaceOf,
  parseCaip10,
  parseCaip2,
} from './caip.js';
export type { Caip10, Caip2, Namespace, ParsedCaip10, ParsedCaip2 } from './caip.js';
export {
  WALLET_CREATE_SESSION,
  connectResultFromSession,
  createCaip25Request,
  parseCaip25Request,
  parseCaip25Result,
  sessionFromCaip25Result,
} from './caip25.js';
export type {
  Caip25ConnectResult,
  Caip25PrivateRequestScopeExtensions,
  Caip25PrivateScopeParams,
  Caip25Request,
  Caip25RequestParams,
  Caip25RequestScope,
  Caip25Result,
  Caip25ResultScope,
} from './caip25.js';
export {
  WALLET_INVOKE_METHOD,
  assertInvokeAuthorized,
  createCaip27Request,
  parseCaip27,
  parseCaip27Response,
  toCaip27,
  unwrapCaip27Response,
} from './caip27.js';
export { sessionCovers } from './covers.js';
export {
  EIP155_METHODS,
  projectEthAccounts,
  selectedEip155ChainId,
  sessionFromAccounts,
  withEip155Chain,
} from './eip155.js';
export type {
  Caip27Error,
  Caip27Params,
  Caip27Request,
  Caip27Response,
  Caip27Result,
  Envelope,
  ScopeState,
  Session,
  Transport,
  TransportKind,
} from './types.js';
