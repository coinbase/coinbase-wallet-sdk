// eslint-disable-next-line max-classes-per-file

import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { CoinbaseWalletSDK } from './CoinbaseWalletSDK';
import { ProviderInterface } from './core/type/ProviderInterface';
import { Signer } from './sign/SignerInterface';

describe('CoinbaseWalletSDK', () => {
  describe('initialize', () => {
    test('with defaults', () => {
      const coinbaseWalletSDK1 = new CoinbaseWalletSDK({
        appName: '',
        appLogoUrl: '',
      });

      expect(coinbaseWalletSDK1).toMatchObject({
        appLogoUrl: null,
        appName: 'DApp',
      });
    });
  });

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

    // TODO: revisit these tests
    describe('extension', () => {
      const mockProvider = { close: jest.fn() } as unknown as ProviderInterface;

      beforeAll(() => {
        window.coinbaseWalletExtension = mockProvider;
      });

      afterAll(() => {
        window.coinbaseWalletExtension = undefined;
        window.coinbaseWalletExtensionSigner = undefined;
      });

      test('@makeWeb3Provider - only walletExtension injected', () => {
        // Returns extension provider
        expect(coinbaseWalletSDK2.makeWeb3Provider()).toEqual(mockProvider);
      });

      test('@makeWeb3Provider - both walletExtension and walletExtensionSigner injected', () => {
        // Returns extension provider
        window.coinbaseWalletExtensionSigner = {} as unknown as Signer;

        const provider = coinbaseWalletSDK2.makeWeb3Provider();
        expect(provider).not.toEqual(mockProvider);
      });

      test('@makeWeb3Provider, but with smartWalletOnly as true', () => {
        const sdk = new CoinbaseWalletSDK({
          appName: 'Test',
          appLogoUrl: 'http://coinbase.com/wallet-logo.png',
          smartWalletOnly: true,
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

      const mockCipherProvider = new MockCipherProviderClass();
      beforeAll(() => {
        // @ts-expect-error mocked provider
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
          smartWalletOnly: true,
        });
        expect(sdk.makeWeb3Provider()).toEqual(mockCipherProvider);
      });
    });
  });
});
