import type { Address } from ':core/type/index.js';

/** ERC-7846 `wallet_connect` request. */
export type WalletConnectRequest = {
  method: 'wallet_connect';
  params: WalletConnectParams;
};

export type WalletConnectParams = [
  {
    /** JSON-RPC method version. */
    version: string;
    /** Capabilities to request, such as `signInWithEthereum`. */
    capabilities?: Record<string, unknown>;
  },
];

/** ERC-7846 `wallet_connect` result: each connected account with its granted capabilities. */
export type WalletConnectResult = {
  accounts: {
    address: Address;
    /** Required by ERC-7846; omitted when the wallet sent none. */
    capabilities?: Record<string, unknown>;
  }[];
};
