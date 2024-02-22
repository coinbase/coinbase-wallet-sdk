import { ScopedLocalStorage } from '../../core/ScopedLocalStorage';
import { Chain } from '../../core/type';

const ACTIVE_CHAIN_STORAGE_KEY = 'activeChain';
const AVAILABLE_CHAINS_STORAGE_KEY = 'availableChains';

export class ChainManager {
  private storage = new ScopedLocalStorage('CBWSDK', 'SCWChainManager');

  private availableChains?: Chain[];
  private _activeChain: Chain;
  get activeChain() {
    return this._activeChain;
  }

  constructor(private chainUpdatedListener: (_: Chain) => void) {
    this._activeChain = this.loadItemFromStorage(ACTIVE_CHAIN_STORAGE_KEY) || { id: 1 };
    this.availableChains = this.loadItemFromStorage(AVAILABLE_CHAINS_STORAGE_KEY);

    this.chainUpdatedListener(this._activeChain);
  }

  switchChain(chainId: number): boolean {
    const chain = this.availableChains?.find((chain) => chain.id === chainId);
    if (!chain) return false;
    if (chain === this._activeChain) return true;

    this._activeChain = chain;
    this.storage.setItem(ACTIVE_CHAIN_STORAGE_KEY, JSON.stringify(chain));
    this.chainUpdatedListener(chain);
    return true;
  }

  updateAvailableChains(rawChains: { [key: number]: string } | undefined) {
    if (!rawChains || Object.keys(rawChains).length === 0) return;

    const chains = Object.entries(rawChains).map(([id, rpcUrl]) => ({ id: Number(id), rpcUrl }));
    this.availableChains = chains;
    this.storage.setItem(AVAILABLE_CHAINS_STORAGE_KEY, JSON.stringify(chains));

    this.switchChain(this._activeChain.id);
  }

  private loadItemFromStorage<T>(key: string): T | undefined {
    const item = this.storage.getItem(key);
    return item ? JSON.parse(item) : undefined;
  }
}
