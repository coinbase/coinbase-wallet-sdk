import { standardErrors } from ':core/error/errors.js';
import { parseErrorCodeFromAny, parseErrorMessageFromAny } from './utils.js';

describe('parseErrorMessageFromAny', () => {
  it('should return message when object has string message property', () => {
    const error = { message: 'Something went wrong' };
    expect(parseErrorMessageFromAny(error)).toBe('Something went wrong');
  });

  it('should return message from Error objects', () => {
    const error = new Error('Network error');
    expect(parseErrorMessageFromAny(error)).toBe('Network error');
  });

  it('should return message from custom error objects', () => {
    const error = { name: 'CustomError', message: 'Custom error message' };
    expect(parseErrorMessageFromAny(error)).toBe('Custom error message');
  });

  it('should return empty string when message is empty string', () => {
    const error = { message: '' };
    expect(parseErrorMessageFromAny(error)).toBe('');
  });

  it('should return empty string when message is undefined', () => {
    const error = { message: undefined };
    expect(parseErrorMessageFromAny(error)).toBe('');
  });

  it('should return empty string for a thrown primitive', () => {
    expect(parseErrorMessageFromAny('boom')).toBe('');
    expect(parseErrorMessageFromAny(undefined)).toBe('');
  });
});

describe('parseErrorCodeFromAny', () => {
  it('reads the code of a provider error', () => {
    expect(parseErrorCodeFromAny(standardErrors.provider.unauthorized())).toBe(4100);
    expect(parseErrorCodeFromAny({ code: 4001, message: 'rejected' })).toBe(4001);
  });

  it('has no code for errors without a numeric one', () => {
    expect(parseErrorCodeFromAny(new Error('Network error'))).toBeUndefined();
    expect(parseErrorCodeFromAny({ code: 'ECONNRESET' })).toBeUndefined();
    expect(parseErrorCodeFromAny('boom')).toBeUndefined();
  });
});
