import { standardErrors } from ':core/error/errors.js';
import type { WalletTransport } from ':core/transport/index.js';
import { activeSession } from ':core/session/grants.js';
import { sessionCovers } from ':core/session/grants.js';
import { createSession } from ':core/session/createSession.js';
import { invoke } from ':core/session/invoke.js';
import { SOLANA_MAINNET } from './caip.js';
import {
  SOLANA_MAINNET_REQUIRED_SCOPES,
  createSolanaMainnetScopes,
  projectSolanaAccounts,
} from './session.js';
import { toEnvelope } from './envelope.js';
import { solanaTranslator } from './translator.js';
import type {
  SolanaConnectRequest,
  SolanaDisconnectRequest,
  SolanaInvokeRequest,
  SolanaInvokeResult,
  SolanaRequest,
} from './types.js';

async function connect(transport: WalletTransport): Promise<string[]> {
  // Reuse a session that already covers mainnet; otherwise pair. Solana authorization is
  // genuinely per chain, so unlike EVM this check can both succeed and fail.
  const restored = activeSession(transport.readSession());
  const session =
    restored && sessionCovers(restored, SOLANA_MAINNET_REQUIRED_SCOPES)
      ? restored
      : await createSession(transport, { scopes: createSolanaMainnetScopes() });
  const accounts = projectSolanaAccounts(session);
  if (accounts.length === 0) {
    throw standardErrors.provider.unauthorized(
      'wallet_createSession did not grant a Solana mainnet account'
    );
  }
  return accounts;
}

/**
 * Internal Solana entry into the shared createSession/invoke kernel.
 *
 * The Wallet Standard implementation calls this boundary with native bytes.
 * The Solana translator alone owns JSON-safe CAIP encoding.
 */
export function handleSolanaRequest(
  transport: WalletTransport,
  request: SolanaConnectRequest
): Promise<string[]>;
export function handleSolanaRequest(
  transport: WalletTransport,
  request: SolanaDisconnectRequest
): Promise<void>;
export function handleSolanaRequest(
  transport: WalletTransport,
  request: SolanaInvokeRequest
): Promise<SolanaInvokeResult>;
export async function handleSolanaRequest(
  transport: WalletTransport,
  request: SolanaRequest
): Promise<string[] | void | SolanaInvokeResult> {
  const session = activeSession(transport.readSession());
  switch (request.method) {
    case 'connect':
      return connect(transport);
    case 'disconnect':
      if (sessionCovers(session, [SOLANA_MAINNET])) await transport.cleanup();
      return undefined;
    case 'solana_signMessage':
    case 'solana_signTransaction':
    case 'solana_signAndSendTransaction':
    case 'solana_signAndSendAllTransactions':
    case 'coinbase_signPreparedCalls':
      if (!sessionCovers(session, [SOLANA_MAINNET]) || !session) {
        throw standardErrors.provider.unauthorized('Must connect the Solana wallet first');
      }
      return invoke(session, toEnvelope(request), transport, solanaTranslator);
    default:
      throw standardErrors.provider.unsupportedMethod(
        `Unsupported Solana method ${(request as { method?: unknown }).method}`
      );
  }
}
