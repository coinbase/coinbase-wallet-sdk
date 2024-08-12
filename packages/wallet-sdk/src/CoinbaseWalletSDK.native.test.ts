import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { CoinbaseWalletSDK } from './CoinbaseWalletSDK.native';
import { MOBILE_SDK_RESPONSE_PATH } from ':core/constants';

jest.mock('./CoinbaseWalletProvider');
jest.mock(':core/storage/ScopedAsyncStorage');

describe('CoinbaseWalletSDK', () => {
  const mockAppDeeplinkUrl = 'https://example.com';
  const mockMetadata = {
    appName: 'TestDapp',
    appLogoUrl: 'https://example.com/logo.png',
    appChainIds: [1, 42],
    appDeeplinkUrl: mockAppDeeplinkUrl,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw an error if appDeeplinkUrl is not provided', () => {
      expect(() => new CoinbaseWalletSDK({})).toThrow('appDeeplinkUrl is required on Mobile');
    });

    it('should initialize metadata with default values', () => {
      const sdk = new CoinbaseWalletSDK({ appDeeplinkUrl: mockAppDeeplinkUrl });
      expect(sdk['metadata']).toEqual({
        appName: 'Dapp',
        appLogoUrl: null,
        appChainIds: [],
        appDeeplinkUrl: `${mockAppDeeplinkUrl}/${MOBILE_SDK_RESPONSE_PATH}`,
      });
    });

    it('should initialize metadata with provided values', () => {
      const sdk = new CoinbaseWalletSDK(mockMetadata);
      expect(sdk['metadata']).toEqual({
        ...mockMetadata,
        appDeeplinkUrl: `${mockAppDeeplinkUrl}/${MOBILE_SDK_RESPONSE_PATH}`,
      });
    });

    it('should initialize owners with provided values', () => {
      const owners = ['0xOwner1', '0xOwner2'];
      const sdk = new CoinbaseWalletSDK({ ...mockMetadata, owners });
      expect(sdk['owners']).toEqual(owners);
    });
  });

  describe('makeWeb3Provider', () => {
    it('should return a new CoinbaseWalletProvider instance', () => {
      const sdk = new CoinbaseWalletSDK(mockMetadata);
      const provider = sdk.makeWeb3Provider();
      expect(provider).toBeInstanceOf(CoinbaseWalletProvider);
      expect(CoinbaseWalletProvider).toHaveBeenCalledWith({
        metadata: sdk['metadata'],
        preference: { options: 'smartWalletOnly' },
        owners: [],
      });
    });

    it('should pass owners to CoinbaseWalletProvider', () => {
      const owners = ['0xOwner1', '0xOwner2'];
      const sdk = new CoinbaseWalletSDK({ ...mockMetadata, owners });
      const provider = sdk.makeWeb3Provider();
      expect(provider).toBeInstanceOf(CoinbaseWalletProvider);
      expect(CoinbaseWalletProvider).toHaveBeenCalledWith({
        metadata: sdk['metadata'],
        preference: { options: 'smartWalletOnly' },
        owners,
      });
    });
  });
});
