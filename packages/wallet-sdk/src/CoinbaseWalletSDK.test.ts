import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { CoinbaseWalletSDK } from './CoinbaseWalletSDK';
import { Window } from ':core/providerUtils';
import { ProviderInterface } from ':core/type/ProviderInterface';

const window = globalThis as Window;

describe('CoinbaseWalletSDK', () => {
  describe('public methods', () => {
    let coinbaseWalletSDK2: CoinbaseWalletSDK;
    beforeEach(() => {
      coinbaseWalletSDK2 = new CoinbaseWalletSDK({
        appName: 'Test',
        appLogoUrl: 'http://coinbase.com/wallet-logo.png',
      });
    });

    describe('sdk', () => {
      test('@makeWeb3Provider', () => {
        expect(coinbaseWalletSDK2.makeWeb3Provider()).toBeInstanceOf(CoinbaseWalletProvider);
      });

      test('@getCoinbaseWalletLogo', () => {
        let svgUri;

        svgUri = coinbaseWalletSDK2.getCoinbaseWalletLogo('standard');
        expect(svgUri).toContain("viewBox='0 0 1024 1024'");

        svgUri = coinbaseWalletSDK2.getCoinbaseWalletLogo('circle');
        expect(svgUri).toContain("viewBox='0 0 999.81 999.81'");

        svgUri = coinbaseWalletSDK2.getCoinbaseWalletLogo('text');
        expect(svgUri).toContain("viewBox='0 0 528.15 53.64'");
        expect(svgUri).toContain('fill:%230052ff');

        svgUri = coinbaseWalletSDK2.getCoinbaseWalletLogo('textWithLogo');
        expect(svgUri).toContain("viewBox='0 0 308.44 77.61'");
        expect(svgUri).toContain('fill:%230052ff');

        svgUri = coinbaseWalletSDK2.getCoinbaseWalletLogo('textLight');
        expect(svgUri).toContain("viewBox='0 0 528.15 53.64'");
        expect(svgUri).toContain('fill:%23fefefe');

        svgUri = coinbaseWalletSDK2.getCoinbaseWalletLogo('textWithLogoLight');
        expect(svgUri).toContain("viewBox='0 0 308.44 77.61'");
        expect(svgUri).toContain('fill:%23fefefe');
      });
    });

    describe('extension', () => {
      const mockProvider = { close: jest.fn() } as unknown as ProviderInterface;

      beforeAll(() => {
        window.coinbaseWalletExtension = mockProvider;
      });

      afterAll(() => {
        window.coinbaseWalletExtension = undefined;
      });

      test('@makeWeb3Provider - only walletExtension injected', () => {
        // Returns extension provider
        expect(coinbaseWalletSDK2.makeWeb3Provider()).toEqual(mockProvider);
      });

      test('@makeWeb3Provider - walletExtension.shouldUseSigner is true', () => {
        // Returns extension provider
        const mockProvider2 = {
          close: jest.fn(),
          shouldUseSigner: true,
        } as unknown as ProviderInterface;
        window.coinbaseWalletExtension = mockProvider2;

        const provider = coinbaseWalletSDK2.makeWeb3Provider();
        expect(provider).not.toEqual(mockProvider2);
      });

      test('@makeWeb3Provider, but with smartWalletOnly as true', () => {
        const sdk = new CoinbaseWalletSDK({
          appName: 'Test',
          appLogoUrl: 'http://coinbase.com/wallet-logo.png',
          preference: {
            options: 'smartWalletOnly',
          },
        });
        // Returns extension provider
        const provider = sdk.makeWeb3Provider();
        expect(provider).toBeTruthy();
        expect(provider).not.toEqual(mockProvider);
      });
    });

    describe('cipher provider', () => {
      class MockCipherProviderClass {
        public isCoinbaseBrowser = true;
      }

      const mockCipherProvider = new MockCipherProviderClass() as unknown as ProviderInterface;
      beforeAll(() => {
        window.ethereum = mockCipherProvider;
      });

      afterAll(() => {
        window.ethereum = undefined;
      });

      test('@makeWeb3Provider', () => {
        expect(coinbaseWalletSDK2.makeWeb3Provider()).toEqual(mockCipherProvider);
      });

      test('@makeWeb3Provider, it should ignore smartWalletOnly true', () => {
        const sdk = new CoinbaseWalletSDK({
          appName: 'Test',
          appLogoUrl: 'http://coinbase.com/wallet-logo.png',
          preference: {
            options: 'smartWalletOnly',
          },
        });
        expect(sdk.makeWeb3Provider()).toEqual(mockCipherProvider);
      });
    });
  });
});
