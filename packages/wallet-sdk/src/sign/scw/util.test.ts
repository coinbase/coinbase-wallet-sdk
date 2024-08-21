import { isPresigned } from './util';
import { RequestArguments } from ':core/provider/interface';

describe('isPresigned', () => {
  it('should throw an error for non-wallet_sendCalls method', () => {
    const request: RequestArguments = {
      method: 'some_other_method',
      params: {},
    };
    expect(() => isPresigned(request)).toThrow('Invalid method for isPresigned()');
  });

  it('should return true for valid presigned request', () => {
    const request: RequestArguments = {
      method: 'wallet_sendCalls',
      params: {
        capabilities: {
          presigned: {
            some: 'data',
          },
        },
      },
    };
    expect(isPresigned(request)).toBe(true);
  });

  it('should return false when presigned is invalid', () => {
    const request: RequestArguments = {
      method: 'wallet_sendCalls',
      params: {
        capabilities: {
          presigned: null,
        },
      },
    };
    expect(isPresigned(request)).toBe(false);
  });

  it('should return false when capabilities is missing', () => {
    const request: RequestArguments = {
      method: 'wallet_sendCalls',
      params: {},
    };
    expect(isPresigned(request)).toBe(false);
  });

  it('should return false when params is missing', () => {
    const request: RequestArguments = {
      method: 'wallet_sendCalls',
    };
    expect(isPresigned(request)).toBe(false);
  });
});
