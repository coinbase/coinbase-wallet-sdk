import type { ProviderEventCallback } from ':core/provider/interface.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { ActiveChain } from './activeChain.js';

/**
 * EVM-only context around a chain-neutral wallet transport.
 *
 * Public EIP-1193 events and active-chain projection belong to the provider
 * interface, not the shared transport.
 */
export type Eip1193Context = {
  readonly transport: WalletTransport;
  readonly emit: ProviderEventCallback;
  readonly chain: ActiveChain;
};
