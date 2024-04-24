import { determineMethodCategory } from './method';

describe('determineMethodCategory', () => {
  test('should return "sign" for signing methods', () => {
    const methods = ['eth_requestAccounts', 'eth_signTransaction', 'wallet_switchEthereumChain'];
    methods.forEach((method) => {
      expect(determineMethodCategory(method)).toBe('sign');
    });
  });

  test('should return "state" for state query methods', () => {
    const methods = ['eth_chainId', 'eth_accounts'];
    methods.forEach((method) => {
      expect(determineMethodCategory(method)).toBe('state');
    });
  });

  test('should return "filter" for filter methods', () => {
    const methods = ['eth_newFilter', 'eth_getFilterChanges'];
    methods.forEach((method) => {
      expect(determineMethodCategory(method)).toBe('filter');
    });
  });

  test('should return "deprecated" for deprecated methods', () => {
    const methods = ['eth_sign', 'eth_signTypedData_v2'];
    methods.forEach((method) => {
      expect(determineMethodCategory(method)).toBe('deprecated');
    });
  });

  test('should return "unsupported" for unsupported methods', () => {
    const methods = ['eth_subscribe', 'eth_unsubscribe'];
    methods.forEach((method) => {
      expect(determineMethodCategory(method)).toBe('unsupported');
    });
  });

  test('should return undefined for unknown methods', () => {
    expect(determineMethodCategory('unknown_method')).toBeUndefined();
  });
});
