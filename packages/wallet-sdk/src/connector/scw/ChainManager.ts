import { ScopedLocalStorage } from '../../lib/ScopedLocalStorage';
import { Chain } from '../ConnectorInterface';

const ACTIVE_CHAIN_STORAGE_KEY = 'SCW:activeChain';
const AVAILABLE_CHAINS_STORAGE_KEY = 'SCW:availableChains';

export class ChainManager {
  activeChain: Chain;
  availableChains?: Chain[];

  constructor(
    private storage: ScopedLocalStorage,
    private chainUpdatedListener: (_: Chain) => void
  ) {
    this.activeChain = this.loadItemFromStorage(ACTIVE_CHAIN_STORAGE_KEY) || { id: 1 };
    this.availableChains = this.loadItemFromStorage(AVAILABLE_CHAINS_STORAGE_KEY);

    this.chainUpdatedListener(this.activeChain);
  }

  switchChain(chainId: number): boolean {
    const chain = this.availableChains?.find((chain) => chain.id === chainId);
    if (!chain) return false;
    if (chain === this.activeChain) return true;

    this.activeChain = chain;
    this.storage.setItem(ACTIVE_CHAIN_STORAGE_KEY, JSON.stringify(chain));
    this.chainUpdatedListener(chain);
    return true;
  }

  updateAvailableChains(rawChains: { [key: number]: string } | undefined) {
    if (!rawChains || Object.keys(rawChains).length === 0) return;

    const chains = Object.entries(rawChains).map(([id, rpcUrl]) => ({ id: Number(id), rpcUrl }));
    this.availableChains = chains;
    this.storage.setItem(AVAILABLE_CHAINS_STORAGE_KEY, JSON.stringify(chains));

    this.switchChain(this.activeChain.id);
  }

  private loadItemFromStorage<T>(key: string): T | undefined {
    const item = this.storage.getItem(key);
    return item ? JSON.parse(item) : undefined;
  }
}
