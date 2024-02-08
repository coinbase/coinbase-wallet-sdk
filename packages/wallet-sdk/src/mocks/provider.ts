import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { RelayEventManager } from '../relay/RelayEventManager';
import { LegacyProvider } from '../relay/walletlink/LegacyProvider';

export const mockExtensionProvider = new LegacyProvider({
  chainId: 1,
  jsonRpcUrl: 'jsonrpc-url',
  overrideIsMetaMask: false,
  relayEventManager: new RelayEventManager(),
  relayProvider: jest.fn(),
  storage: new ScopedLocalStorage('-walletlink'),
});
mockExtensionProvider.initializeRelay = jest.fn();
