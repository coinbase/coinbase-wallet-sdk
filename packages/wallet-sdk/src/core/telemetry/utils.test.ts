import { parseErrorMessageFromAny } from './utils.js';

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
});
