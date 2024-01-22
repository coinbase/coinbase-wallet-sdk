import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { CoinbaseWalletProvider } from '../provider/CoinbaseWalletProvider';
import { RelayEventManager } from '../relay/RelayEventManager';

export const mockExtensionProvider = new CoinbaseWalletProvider({
  chainId: 1,
  jsonRpcUrl: 'jsonrpc-url',
  overrideIsMetaMask: false,
  relayEventManager: new RelayEventManager(),
  relayProvider: jest.fn(),
  storage: new ScopedLocalStorage('-walletlink'),
});
mockExtensionProvider.initializeRelay = jest.fn();
