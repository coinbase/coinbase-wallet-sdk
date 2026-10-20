import {
  sessionToWalletConnectResult,
  walletConnectToCaip25Scopes,
} from ':core/namespaces/eip155/eip1193/connect.js';
import { EIP155_REQUIRED_METHODS } from ':core/namespaces/eip155/methods.js';
import { activeEip155Grant } from ':core/namespaces/eip155/session.js';
import type { WalletConnectRequest, WalletConnectResult } from ':core/rpc/wallet_connect.js';
import { getInjectedProvider } from '../eip1193/getInjectedProvider.js';
import type { ChainConnector, EvmConnectOption } from './types.js';

export function createEvmConnector(option: EvmConnectOption): ChainConnector {
  // An empty capabilities object means nothing was requested.
  const capabilities =
    option !== true && Object.keys(option.capabilities ?? {}).length > 0
      ? option.capabilities
      : undefined;

  return {
    scopes: walletConnectToCaip25Scopes([{ version: '1', ...(capabilities && { capabilities }) }]),

    // Capability requests can carry fresh auth challenges, so they always go to the wallet.
    // One grant covers every EVM chain, so there is no chain list to check, only methods.
    needsPopup: (stored) => {
      if (capabilities) return true;
      const grant = stored && activeEip155Grant(stored);
      return !grant || !EIP155_REQUIRED_METHODS.every((method) => grant.methods.includes(method));
    },

    // A reused grant can still hold answers to an earlier request, so capabilities come back
    // only when this request asked for them.
    readResult: async (session) => {
      const result = sessionToWalletConnectResult(session);
      return {
        evm: capabilities
          ? result
          : { accounts: result.accounts.map(({ address }) => ({ address })) },
      };
    },

    connectHost: async () => {
      const provider = getInjectedProvider();
      if (!provider) return { evm: { accounts: [] } };

      const response = await provider.request({
        method: 'wallet_connect',
        params: [{ version: '1', ...(capabilities && { capabilities }) }],
      } satisfies WalletConnectRequest);

      // The host's own provider answers `wallet_connect` in the ERC-7846 shape.
      return { evm: response as WalletConnectResult };
    },
  };
}
