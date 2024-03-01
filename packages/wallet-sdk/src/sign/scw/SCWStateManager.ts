import { StateUpdateListener } from '../UpdateListenerInterface';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage';
import { AddressString, Chain } from ':core/type';

const ACCOUNTS_KEY = 'accounts';
const ACTIVE_CHAIN_STORAGE_KEY = 'activeChain';
const AVAILABLE_CHAINS_STORAGE_KEY = 'availableChains';

export class SCWStateManager {
  private storage = new ScopedLocalStorage('CBWSDK', 'SCWStateManager');
  private updateListener: StateUpdateListener;

  private availableChains?: Chain[];
  private _accounts: AddressString[];
  private _activeChain: Chain;
  get accounts() {
    return this._accounts;
  }
  get activeChain() {
    return this._activeChain;
  }

  constructor(options: { updateListener: StateUpdateListener }) {
    this.updateListener = options.updateListener;

    this.availableChains = this.loadItemFromStorage(AVAILABLE_CHAINS_STORAGE_KEY);
    const accounts = this.loadItemFromStorage<AddressString[]>(ACCOUNTS_KEY);
    const chain = this.loadItemFromStorage<Chain>(ACTIVE_CHAIN_STORAGE_KEY);

    if (accounts) {
      this.updateListener.onAccountsUpdate({
        accounts,
        source: 'storage',
      });
    }
    if (chain) {
      this.updateListener.onChainUpdate({
        chain,
        source: 'storage',
      });
    }

    this._accounts = accounts || [];
    this._activeChain = chain || { id: 1 };
  }

  updateAccounts(accounts: AddressString[]) {
    this._accounts = accounts;
    this.storeItemToStorage(ACCOUNTS_KEY, accounts);
    this.updateListener.onAccountsUpdate({
      accounts,
      source: 'wallet',
    });
  }

  switchChain(chainId: number): boolean {
    const chain = this.availableChains?.find((chain) => chain.id === chainId);
    if (!chain) return false;
    if (chain === this._activeChain) return true;

    this._activeChain = chain;
    this.storeItemToStorage(ACTIVE_CHAIN_STORAGE_KEY, chain);
    this.updateListener.onChainUpdate({
      chain,
      source: 'wallet',
    });
    return true;
  }

  updateAvailableChains(rawChains: { [key: number]: string }) {
    if (!rawChains || Object.keys(rawChains).length === 0) return;

    const chains = Object.entries(rawChains).map(([id, rpcUrl]) => ({ id: Number(id), rpcUrl }));
    this.availableChains = chains;
    this.storeItemToStorage(AVAILABLE_CHAINS_STORAGE_KEY, chains);

    this.switchChain(this._activeChain.id);
  }

  private storeItemToStorage<T>(key: string, item: T) {
    this.storage.setItem(key, JSON.stringify(item));
  }

  private loadItemFromStorage<T>(key: string): T | undefined {
    const item = this.storage.getItem(key);
    return item ? JSON.parse(item) : undefined;
  }

  clear() {
    this.storage.clear();
  }
}
