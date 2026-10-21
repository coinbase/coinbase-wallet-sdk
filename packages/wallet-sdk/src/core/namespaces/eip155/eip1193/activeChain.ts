/**
 * Chain the provider reports when nothing has ever switched it.
 *
 * Applications do not declare chains: authorization covers every EVM chain, and the
 * wallet decides which it can serve. Ethereum mainnet is the neutral start.
 */
export const DEFAULT_CHAIN_ID = 1;

export type ActiveChain = {
  get: () => number;
  select: (chainId: number) => boolean;
};

/** Where the active chain is kept between page loads. */
export type ActiveChainStore = {
  get(): number | undefined;
  set(chainId: number): void;
};

/**
 * The mutable active chain for one EIP-1193 provider instance.
 *
 * This is presentation state, not authorization. It moves only when something asks it to
 * — `wallet_switchEthereumChain`, or the wallet approving a chain the dapp requested —
 * and every move the application can observe is announced with `chainChanged`.
 *
 * It starts where the last provider left off, so a reload keeps the dapp on its chain.
 * That start is not a move and is not announced, and it is not checked against the
 * wallet's catalog: a chain the wallet cannot serve fails as it would after a local switch.
 */
export function createActiveChain({
  store,
  onChange,
}: {
  store?: ActiveChainStore;
  onChange: (chainId: number) => void;
}): ActiveChain {
  let activeChainId = store?.get() ?? DEFAULT_CHAIN_ID;

  return {
    get: () => activeChainId,
    select: (chainId) => {
      if (activeChainId === chainId) return false;
      activeChainId = chainId;
      store?.set(chainId);
      onChange(chainId);
      return true;
    },
  };
}
