import {
  SOLANA_MAINNET,
  SOLANA_WALLET_STANDARD_MAINNET,
  projectSolanaAccounts,
} from ':core/namespaces/solana/index.js';
import { activeGrantForChain } from ':core/session/grants.js';
import type { Session } from ':core/session/types.js';
import type { IdentifierString, WalletAccount } from '@wallet-standard/base';
import { ReadonlyWalletAccount } from '@wallet-standard/wallet';
import * as Base58 from 'ox/Base58';
import { ACCOUNT_FEATURES, OPTIONAL_FEATURE_METHODS } from './features.js';

/**
 * The optional features the session's Solana grant allows. The wallet and its accounts list
 * only these.
 */
export function grantedOptionalFeatures(session: Session): IdentifierString[] {
  const methods = activeGrantForChain(session, SOLANA_MAINNET)?.methods ?? [];
  return OPTIONAL_FEATURE_METHODS.filter(({ method }) => methods.includes(method)).map(
    ({ feature }) => feature
  );
}

/** The session's Solana accounts as Wallet Standard accounts, in wallet-granted order. */
export function sessionToWalletAccounts(session: Session): WalletAccount[] {
  const features = [...ACCOUNT_FEATURES, ...grantedOptionalFeatures(session)];
  // `projectSolanaAccounts` only returns 32-byte base58 keys, so decoding cannot fail.
  return projectSolanaAccounts(session).map(
    (address) =>
      new ReadonlyWalletAccount({
        address,
        publicKey: Base58.toBytes(address),
        chains: [SOLANA_WALLET_STANDARD_MAINNET],
        features,
      })
  );
}
