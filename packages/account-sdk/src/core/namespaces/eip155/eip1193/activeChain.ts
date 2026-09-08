import type { Session } from ':core/session/types.js';
import { firstEip155ChainId, isKnownEip155Chain } from '../session.js';

export type ActiveChain = {
  get: () => number;
  select: (chainId: number, options?: { notify?: boolean }) => boolean;
  reconcile: (session: Session | undefined) => void;
};

function initialChainId(session: Session | undefined, defaultChainId: number): number {
  if (session && isKnownEip155Chain(session, defaultChainId)) {
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
      if (nextSession && isKnownEip155Chain(nextSession, activeChainId)) return;
      const fallbackChainId = nextSession ? firstEip155ChainId(nextSession) : undefined;
      if (fallbackChainId !== undefined) select(fallbackChainId);
    },
  };
}
