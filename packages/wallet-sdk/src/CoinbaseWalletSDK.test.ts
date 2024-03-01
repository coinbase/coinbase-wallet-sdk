// eslint-disable-next-line max-classes-per-file

import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { CoinbaseWalletSDK } from './CoinbaseWalletSDK';
import { ProviderInterface } from './core/type/ProviderInterface';

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

      // TODO: nate re-enable these tests
      // test('@disconnect', () => {
      //   const relayResetMock = jest
      //     .spyOn((coinbaseWalletSDK2 as any)._relay, 'resetAndReload')
      //     .mockImplementation(() => 'resetAndReload');
      //   coinbaseWalletSDK2.disconnect();

      //   expect(relayResetMock).toHaveBeenCalled();
      // });

      // test('@setAppInfo', () => {
      //   const relaySetAppInfoMock = jest
      //     .spyOn(WalletLinkRelay.prototype, 'setAppInfo')
      //     .mockImplementation(() => 'setAppInfo');
      //   coinbaseWalletSDK2.setAppInfo('sdk', 'http://sdk-image.png');

      //   expect(relaySetAppInfoMock).toHaveBeenCalledWith('sdk', 'http://sdk-image.png');
      // });

      // test('@getQrUrl', () => {
      //   const qrUrl = coinbaseWalletSDK2.getQrUrl() || '';
      //   const url = new URL(qrUrl);

      //   expect(url.hostname).toEqual('www.walletlink.org');
      //   expect(url.hash.split('=')).toHaveLength(6);
      // });

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
      });

      test('@makeWeb3Provider', () => {
        // Returns extension provider
        expect(coinbaseWalletSDK2.makeWeb3Provider()).toEqual(mockProvider);
      });

      test('@makeWeb3Provider, but with connectionPreference as embedded', () => {
        const sdk = new CoinbaseWalletSDK({
          appName: 'Test',
          appLogoUrl: 'http://coinbase.com/wallet-logo.png',
          connectionPreference: 'embedded',
        });
        // Returns extension provider
        const provider = sdk.makeWeb3Provider();
        expect(provider).toBeTruthy();
        expect(provider).not.toEqual(mockProvider);
      });

      test('@disconnect', async () => {
        const mockExtensionProvider = mockProvider as unknown as { close: jest.Mock };
        jest.spyOn(mockExtensionProvider, 'close').mockImplementation(() => 'mockClose');
        // Calls extension close
        coinbaseWalletSDK2.disconnect();
        expect(await mockExtensionProvider.close()).toBe('mockClose');
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

      test('@makeWeb3Provider, it should ignore embedded connectionPreference', () => {
        const sdk = new CoinbaseWalletSDK({
          appName: 'Test',
          appLogoUrl: 'http://coinbase.com/wallet-logo.png',
          connectionPreference: 'embedded',
        });
        expect(sdk.makeWeb3Provider()).toEqual(mockCipherProvider);
      });
    });
  });
});
