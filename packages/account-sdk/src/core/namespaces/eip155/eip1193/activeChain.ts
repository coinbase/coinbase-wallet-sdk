import type { Session } from ':core/session/types.js';
import { eip155Caip2 } from '../caip.js';
import { firstEip155ChainId } from '../session.js';

export type ActiveChain = {
  get: () => number;
  select: (chainId: number, options?: { notify?: boolean }) => boolean;
  reconcile: (session: Session | undefined) => void;
};

function initialChainId(session: Session | undefined, defaultChainId: number): number {
  if (session?.scopes[eip155Caip2(defaultChainId)]?.accounts.length) {
    return defaultChainId;
  }
  return (session ? firstEip155ChainId(session) : undefined) ?? defaultChainId;
}

/** Owns the mutable active chain for one EIP-1193 provider instance. */
export function createActiveChain({
  defaultChainId,
  session,
  onChange,
}: {
  defaultChainId: number;
  session?: Session;
  onChange: (chainId: number) => void;
}): ActiveChain {
  let activeChainId = initialChainId(session, defaultChainId);

  const select: ActiveChain['select'] = (chainId, options) => {
    if (activeChainId === chainId) return false;
    activeChainId = chainId;
    if (options?.notify !== false) onChange(chainId);
    return true;
  };

  return {
    get: () => activeChainId,
    select,
    reconcile: (nextSession) => {
      if (nextSession?.scopes[eip155Caip2(activeChainId)]?.accounts.length) return;
      const fallbackChainId = nextSession ? firstEip155ChainId(nextSession) : undefined;
      if (fallbackChainId !== undefined) select(fallbackChainId);
    },
  };
}
