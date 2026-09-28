/**
 * Chain the provider reports before anything switches it.
 *
 * Applications do not declare chains: authorization covers every EVM chain, and the
 * wallet decides which it can serve. Ethereum mainnet is the neutral start.
 */
export const DEFAULT_CHAIN_ID = 1;

export type ActiveChain = {
  get: () => number;
  select: (chainId: number) => boolean;
};

/**
 * The mutable active chain for one EIP-1193 provider instance.
 *
 * This is presentation state, not authorization. It moves only when something asks it to
 * — `wallet_switchEthereumChain`, or the wallet approving a chain the dapp requested —
 * and every move the application can observe is announced with `chainChanged`.
 */
export function createActiveChain({
  onChange,
}: { onChange: (chainId: number) => void }): ActiveChain {
  let activeChainId = DEFAULT_CHAIN_ID;

  return {
    get: () => activeChainId,
    select: (chainId) => {
      if (activeChainId === chainId) return false;
      activeChainId = chainId;
      onChange(chainId);
      return true;
    },
  };
}
