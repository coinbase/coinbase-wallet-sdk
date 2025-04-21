import {
  addSenderToRequest,
  assertParamsChainId,
  getSenderFromRequest,
  injectRequestCapabilities,
} from './utils.js';

describe('utils', () => {
  describe('getSenderFromRequest', () => {
    const sender = '0x123';
    it.each([
      ['eth_signTransaction', [{ from: sender }], sender],
      ['eth_sendTransaction', [{ from: sender }], sender],
      ['wallet_sendCalls', [{ from: sender }], sender],
      ['eth_signTypedData_v4', [sender, {}], sender],
      ['personal_sign', ['message', sender], sender],
    ])('should return the sender from the request for %s', (method, params, sender) => {
      const request = { method, params };
      expect(getSenderFromRequest(request)).toBe(sender);
    });
  });

  describe('addSenderToRequest', () => {
    it.each([
      ['eth_signTransaction', [{}], [{ from: '0x123' }]],
      ['eth_sendTransaction', [{}], [{ from: '0x123' }]],
      ['wallet_sendCalls', [{}], [{ from: '0x123' }]],
      ['eth_signTypedData_v4', [undefined, {}], ['0x123', {}]],
      ['personal_sign', ['hello', undefined], ['hello', '0x123']],
    ])('should enhance the request params for %s', (method, params, expectedParams) => {
      const request = { method, params };
      const sender = '0x123';
      expect(addSenderToRequest(request, sender)).toEqual({
        method,
        params: expectedParams,
      });
    });
  });
});

describe('assertParamsChainId', () => {
  it('should throw if the params are not an array', () => {
    expect(() => assertParamsChainId({})).toThrow();
  });

  it('should throw if the params array is empty', () => {
    expect(() => assertParamsChainId([])).toThrow();
  });

  it('should throw if the first param does not have a chainId property', () => {
    expect(() => assertParamsChainId([{}])).toThrow();
  });

  it('should throw if the chainId is not a string or number', () => {
    expect(() => assertParamsChainId([{ chainId: true }])).toThrow();
    expect(() => assertParamsChainId([{ chainId: null }])).toThrow();
    expect(() => assertParamsChainId([{ chainId: undefined }])).toThrow();
    expect(() => assertParamsChainId([{ chainId: {} }])).toThrow();
  });

  it('should not throw if the chainId is a string', () => {
    expect(() => assertParamsChainId([{ chainId: '0x1' }])).not.toThrow();
  });

  it('should not throw if the chainId is a number', () => {
    expect(() => assertParamsChainId([{ chainId: 1 }])).not.toThrow();
  });

  it('should throw if params is null or undefined', () => {
    expect(() => assertParamsChainId(null)).toThrow();
    expect(() => assertParamsChainId(undefined)).toThrow();
  });
});

describe('injectRequestCapabilities', () => {
  const capabilities = {
    addSubAccount: {
      account: {
        type: 'create',
        keys: [
          {
            type: 'address',
            key: '0x123',
          },
        ],
      },
    },
  };

  it('should merge capabilities for wallet_connect method', () => {
    const siweCapability = {
      chainId: 84532,
      nonce: Math.random().toString(36).substring(2, 15),
    };
    const request = {
      method: 'wallet_connect',
      params: [
        {
          someParam: 'value',
          capabilities: {
            signInWithEthereum: siweCapability,
          },
        },
      ],
    };

    const result = injectRequestCapabilities(request, capabilities);
    expect(result).toEqual({
      method: 'wallet_connect',
      params: [
        {
          someParam: 'value',
          capabilities: {
            ...capabilities,
            signInWithEthereum: siweCapability,
          },
        },
      ],
    });
  });

  it('should merge capabilities for wallet_sendCalls method', () => {
    const paymasterCapability = {
      url: 'https://paymaster.example.com',
    };
    const request = {
      method: 'wallet_sendCalls',
      params: [
        {
          version: '1.0',
          existingParam: 'test',
          capabilities: {
            paymasterService: paymasterCapability,
          },
        },
      ],
    };

    const result = injectRequestCapabilities(request, capabilities);
    expect(result).toEqual({
      method: 'wallet_sendCalls',
      params: [
        {
          version: '1.0',
          existingParam: 'test',
          capabilities: {
            ...capabilities,
            paymasterService: paymasterCapability,
          },
        },
      ],
    });
  });

  it('should not modify request for other methods', () => {
    const request = {
      method: 'eth_sendTransaction',
      params: [{ someParam: 'value' }],
    };

    const result = injectRequestCapabilities(request, capabilities);
    expect(result).toEqual(request);
  });

  it('should throw if capabilities is not an object', () => {
    const request = {
      method: 'wallet_sendCalls',
      params: [
        {
          capabilities: 'invalid',
        },
      ],
    };

    expect(() => injectRequestCapabilities(request, capabilities)).toThrow();
  });
});
