import { vi } from 'vitest';

import { standardErrors } from ':core/error/errors.js';
import { checkErrorForInvalidRequestArgs, fetchRPCRequest } from './provider.js';

// vitest 2's toThrow(error) compared the message only, so these helpers could claim
// invalidRequest (-32600) while the implementation throws invalidParams (-32602) and
// the assertions still passed. They now state the code that actually ships.
// @ts-expect-error-next-line
const invalidArgsError = (args) =>
  standardErrors.rpc.invalidParams({
    message: 'Expected a single, non-array, object argument.',
    data: args,
  });
// @ts-expect-error-next-line
const invalidMethodError = (args) =>
  standardErrors.rpc.invalidParams({
    message: "'args.method' must be a non-empty string.",
    data: args,
  });
// @ts-expect-error-next-line
const invalidParamsError = (args) =>
  standardErrors.rpc.invalidParams({
    message: "'args.params' must be an object or array if provided.",
    data: args,
  });

describe('Utils', () => {
  describe('fetchRPCRequest', () => {
    function mockFetchResponse(response: unknown) {
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(response),
      });
    }

    it('should throw if the response has an error', async () => {
      mockFetchResponse({
        id: 1,
        result: null,
        error: new Error('rpc fetch error'),
      });
      await expect(
        fetchRPCRequest({ method: 'foo', params: [] }, 'https://example.com')
      ).rejects.toThrow('rpc fetch error');
    });

    it('should return the result if the response is successful', async () => {
      mockFetchResponse({
        id: 1,
        result: 'some result value',
        error: null,
      });
      await expect(
        fetchRPCRequest({ method: 'foo', params: [] }, 'https://example.com')
      ).resolves.toBe('some result value');
    });
  });

  describe('getErrorForInvalidRequestArgs', () => {
    it('should throw if args is not an object', () => {
      const args = 'not an object';
      expect(() => checkErrorForInvalidRequestArgs(args)).toThrow(invalidArgsError(args));
    });

    it('should throw if args is an array', () => {
      const args = ['an array'];
      expect(() => checkErrorForInvalidRequestArgs(args)).toThrow(invalidArgsError(args));
    });

    it('should throw if args.method is not a string', () => {
      const args = { method: 123 };
      expect(() => checkErrorForInvalidRequestArgs(args)).toThrow(invalidMethodError(args));
      const args2 = { method: { method: 'string' } };
      expect(() => checkErrorForInvalidRequestArgs(args2)).toThrow(invalidMethodError(args2));
    });

    it('should throw if args.method is an empty string', () => {
      const args = { method: '' };
      expect(() => checkErrorForInvalidRequestArgs(args)).toThrow(invalidMethodError(args));
    });

    it('should throw if args.params is not an array or object', () => {
      const args = { method: 'foo', params: 'not an array or object' };
      expect(() => checkErrorForInvalidRequestArgs(args)).toThrow(invalidParamsError(args));
      const args2 = { method: 'foo', params: 123 };
      expect(() => checkErrorForInvalidRequestArgs(args2)).toThrow(invalidParamsError(args2));
    });

    it('should throw if args.params is null', () => {
      const args = { method: 'foo', params: null };
      expect(() => checkErrorForInvalidRequestArgs(args)).toThrow(invalidParamsError(args));
    });

    it('should not throw if args.params is undefined', () => {
      expect(() =>
        checkErrorForInvalidRequestArgs({ method: 'foo', params: undefined })
      ).not.toThrow();
      expect(() => checkErrorForInvalidRequestArgs({ method: 'foo' })).not.toThrow();
    });

    it('should not throw if args.params is an array', () => {
      expect(() =>
        checkErrorForInvalidRequestArgs({ method: 'foo', params: ['an array'] })
      ).not.toThrow();
    });

    it('should not throw if args.params is an object', () => {
      expect(() =>
        checkErrorForInvalidRequestArgs({ method: 'foo', params: { foo: 'bar' } })
      ).not.toThrow();
    });

    it('should not throw if args.params is an empty array', () => {
      expect(() => checkErrorForInvalidRequestArgs({ method: 'foo', params: [] })).not.toThrow();
    });

    it('should not throw if args.params is an empty object', () => {
      expect(() => checkErrorForInvalidRequestArgs({ method: 'foo', params: {} })).not.toThrow();
    });

    it('throws error for requests with unsupported or deprecated method', async () => {
      const deprecated = ['eth_sign', 'eth_signTypedData_v2'];
      const unsupported = ['eth_subscribe', 'eth_unsubscribe'];

      for (const method of [...deprecated, ...unsupported]) {
        expect(() => checkErrorForInvalidRequestArgs({ method })).toThrow(
          standardErrors.provider.unsupportedMethod()
        );
      }
    });
  });
});
