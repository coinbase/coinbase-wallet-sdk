import { ScopedLocalStorage } from '../../lib/ScopedLocalStorage';
import { ChainManager } from './ChainManager';

describe('ChainManager', () => {
  const DEFAULT_CHAIN = {
    id: 1,
    rpcUrl: undefined,
  };
  const AVAILABLE_CHAINS = { 7: 'https://chain7.com', 13: 'https://chain13.com' };

  let chainManager: ChainManager;
  let storage: ScopedLocalStorage;

  beforeEach(() => {
    storage = new ScopedLocalStorage('test');
    chainManager = new ChainManager(storage, jest.fn());
  });

  afterEach(() => {
    storage.clear();
  });

  describe('switchChain', () => {
    beforeEach(() => {
      chainManager.updateAvailableChains(AVAILABLE_CHAINS);
    });

    it('should switch the active chain when the chain is available', () => {
      const switched = chainManager.switchChain(7);
      expect(switched).toBe(true);
      expect(chainManager.activeChain.id).toBe(7);
    });

    it('should not switch the active chain when the chain is not available', () => {
      const switched = chainManager.switchChain(3);
      expect(switched).toBe(false);
      expect(chainManager.activeChain.id).toBe(DEFAULT_CHAIN.id);
    });

    it('should not update the active chain when switching to the same chain', () => {
      const switched = chainManager.switchChain(DEFAULT_CHAIN.id);
      expect(switched).toBe(false);
      expect(chainManager.activeChain.id).toBe(DEFAULT_CHAIN.id);
    });
  });

  describe('updateAvailableChains', () => {
    it('should update the active chain when the rpc url of the active chain is updated', () => {
      expect(chainManager.activeChain.rpcUrl).toBeUndefined();
      chainManager.updateAvailableChains({ 1: 'https://chain1.com' });
      expect(chainManager.activeChain.rpcUrl).toBe('https://chain1.com');
    });

    it('should not update the active chain when available chains does not include the active chain', () => {
      chainManager.updateAvailableChains({ 3: 'https://chain3.com' });
      expect(chainManager.activeChain.id).toBe(DEFAULT_CHAIN.id);
    });
  });

  describe('chainUpdatedListener', () => {
    const chainUpdatedListener = jest.fn();

    beforeEach(() => {
      chainManager = new ChainManager(storage, chainUpdatedListener);
      chainManager.updateAvailableChains(AVAILABLE_CHAINS);
    });

    describe('switchChain', () => {
      it('should call chainUpdatedListener when switching the active chain', () => {
        chainManager.switchChain(7);
        expect(chainUpdatedListener).toHaveBeenCalledWith({ id: 7, rpcUrl: 'https://chain7.com' });
      });

      it('should not call chainUpdatedListener when switching to an unavailable chain', () => {
        chainManager.switchChain(3);
        expect(chainUpdatedListener).not.toHaveBeenCalledWith(expect.objectContaining({ id: 3 }));
      });
    });

    describe('updateAvailableChains', () => {
      it('should call chainUpdatedListener when updated available chains include the active chain', () => {
        chainManager.updateAvailableChains({ 1: 'https://chain1.com' });
        expect(chainUpdatedListener).toHaveBeenCalledWith({ id: 1, rpcUrl: 'https://chain1.com' });
      });
      it('should not call chainUpdatedListener when updated available chains does not include the active chain', () => {
        chainManager.updateAvailableChains({ 3: 'https://chain3.com' });
        expect(chainUpdatedListener).not.toHaveBeenCalledWith(expect.objectContaining({ id: 3 }));
      });
    });
  });
});
