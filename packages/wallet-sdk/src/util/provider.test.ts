import { checkErrorForInvalidRequestArgs, getCoinbaseInjectedProvider } from './provider';
import { standardErrors } from ':core/error';
import { ProviderInterface } from ':core/provider/interface';

const window = globalThis as {
  top: Window;
  ethereum?: ProviderInterface;
  coinbaseWalletExtension?: ProviderInterface;
};

// @ts-expect-error-next-line
const invalidArgsError = (args) =>
  standardErrors.rpc.invalidRequest({
    message: 'Expected a single, non-array, object argument.',
    data: args,
  });
// @ts-expect-error-next-line
const invalidMethodError = (args) =>
  standardErrors.rpc.invalidRequest({
    message: "'args.method' must be a non-empty string.",
    data: args,
  });
// @ts-expect-error-next-line
const invalidParamsError = (args) =>
  standardErrors.rpc.invalidRequest({
    message: "'args.params' must be an object or array if provided.",
    data: args,
  });

describe('Utils', () => {
  describe('getCoinbaseInjectedProvider', () => {
    describe('Extension Provider', () => {
      afterEach(() => {
        window.coinbaseWalletExtension = undefined;
      });

      it('should return extension provider', () => {
        const mockSetAppInfo = jest.fn();
        const extensionProvider = {
          shouldUseSigner: false,
          setAppInfo: mockSetAppInfo,
        } as unknown as ProviderInterface;

        window.coinbaseWalletExtension = extensionProvider;

        expect(
          getCoinbaseInjectedProvider({
            metadata: {
              appName: 'Dapp',
              appChainIds: [],
              appLogoUrl: null,
            },
            preference: {
              options: 'all',
            },
          })
        ).toBe(extensionProvider);

        expect(mockSetAppInfo).toHaveBeenCalledWith('Dapp', null, []);
      });

      it('shouldUseSigner as true - should return undefined', () => {
        const extensionProvider = {
          shouldUseSigner: true,
        } as unknown as ProviderInterface;

        window.coinbaseWalletExtension = extensionProvider;

        expect(
          getCoinbaseInjectedProvider({
            metadata: {
              appName: 'Dapp',
              appChainIds: [],
              appLogoUrl: null,
            },
            preference: {
              options: 'all',
            },
          })
        ).toBe(undefined);
      });

      it('smartWalletOnly - should return undefined', () => {
        const extensionProvider = {
          shouldUseSigner: false,
          setAppInfo: jest.fn(),
        } as unknown as ProviderInterface;

        window.coinbaseWalletExtension = extensionProvider;

        expect(
          getCoinbaseInjectedProvider({
            metadata: {
              appName: 'Dapp',
              appChainIds: [],
              appLogoUrl: null,
            },
            preference: {
              options: 'smartWalletOnly',
            },
          })
        ).toBe(undefined);
      });
    });
    describe('Browser Provider', () => {
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

      it('Should return injected browser provider', () => {
        expect(
          getCoinbaseInjectedProvider({
            metadata: {
              appName: 'Dapp',
              appChainIds: [],
              appLogoUrl: null,
            },
            preference: {
              options: 'all',
            },
          })
        ).toBe(mockCipherProvider);
      });

      it('smartWalletOnly - Should still return injected browser provider', () => {
        expect(
          getCoinbaseInjectedProvider({
            metadata: {
              appName: 'Dapp',
              appChainIds: [],
              appLogoUrl: null,
            },
            preference: {
              options: 'smartWalletOnly',
            },
          })
        ).toBe(mockCipherProvider);
      });
    });
  });

  describe('getErrorForInvalidRequestArgs', () => {
    it('should throw if args is not an object', () => {
      const args = 'not an object';
      expect(
        // @ts-expect-error-next-line
        checkErrorForInvalidRequestArgs(args)
      ).toEqual(invalidArgsError(args));
    });

    it('should throw if args is an array', () => {
      const args = ['an array'];
      expect(
        // @ts-expect-error-next-line
        checkErrorForInvalidRequestArgs(args)
      ).toEqual(invalidArgsError(args));
    });

    it('should throw if args.method is not a string', () => {
      const args = { method: 123 };
      expect(
        // @ts-expect-error-next-line
        checkErrorForInvalidRequestArgs(args)
      ).toEqual(invalidMethodError(args));
      const args2 = { method: { method: 'string' } };
      expect(
        // @ts-expect-error-next-line
        checkErrorForInvalidRequestArgs(args2)
      ).toEqual(invalidMethodError(args2));
    });

    it('should throw if args.method is an empty string', () => {
      const args = { method: '' };
      expect(checkErrorForInvalidRequestArgs(args)).toEqual(invalidMethodError(args));
    });

    it('should throw if args.params is not an array or object', () => {
      const args = { method: 'foo', params: 'not an array or object' };
      expect(
        // @ts-expect-error-next-line
        checkErrorForInvalidRequestArgs(args)
      ).toEqual(invalidParamsError(args));
      const args2 = { method: 'foo', params: 123 };
      expect(
        // @ts-expect-error-next-line
        checkErrorForInvalidRequestArgs(args2)
      ).toEqual(invalidParamsError(args2));
    });

    it('should throw if args.params is null', () => {
      const args = { method: 'foo', params: null };
      expect(
        // @ts-expect-error-next-line
        checkErrorForInvalidRequestArgs(args)
      ).toEqual(invalidParamsError(args));
    });

    it('should not throw if args.params is undefined', () => {
      expect(checkErrorForInvalidRequestArgs({ method: 'foo', params: undefined })).toBeUndefined();
      expect(checkErrorForInvalidRequestArgs({ method: 'foo' })).toBeUndefined();
    });

    it('should not throw if args.params is an array', () => {
      expect(
        checkErrorForInvalidRequestArgs({ method: 'foo', params: ['an array'] })
      ).toBeUndefined();
    });

    it('should not throw if args.params is an object', () => {
      expect(
        checkErrorForInvalidRequestArgs({ method: 'foo', params: { foo: 'bar' } })
      ).toBeUndefined();
    });

    it('should not throw if args.params is an empty array', () => {
      expect(checkErrorForInvalidRequestArgs({ method: 'foo', params: [] })).toBeUndefined();
    });

    it('should not throw if args.params is an empty object', () => {
      expect(checkErrorForInvalidRequestArgs({ method: 'foo', params: {} })).toBeUndefined();
    });
  });
});
