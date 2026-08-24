import { RPCResponse } from ':core/message/RPCResponse.js';
import { SDKChain, createClients } from ':store/chain-clients/utils.js';
import type { PopupWire } from './types.js';

/**
 * Persist chain list, native currency, and wallet-level capabilities from a decrypted
 * wallet response. Handshake `capabilities` here are EIP-5792 per-chain maps, not
 * `wallet_connect` account capabilities. Needs the store, not the popup communicator.
 */
export function ingestPopupData(wire: Pick<PopupWire, 'store' | 'chainId'>, response: RPCResponse) {
  const availableChains = response.data?.chains;
  if (availableChains) {
    const nativeCurrencies = response.data?.nativeCurrencies;
    const chains: SDKChain[] = Object.entries(availableChains).map(([id, rpcUrl]) => {
      const nativeCurrency = nativeCurrencies?.[Number(id)];
      return {
        id: Number(id),
        rpcUrl,
        ...(nativeCurrency ? { nativeCurrency } : {}),
      };
    });
    wire.store.chains.set(chains);
    const current = chains.find((c) => c.id === wire.chainId());
    if (current) wire.store.account.set({ chain: current });
    createClients(chains);
  }

  if (response.data?.capabilities) {
    wire.store.account.set({ capabilities: response.data.capabilities });
  }
}
