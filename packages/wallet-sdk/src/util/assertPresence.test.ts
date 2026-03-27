import { assertArrayPresence, assertPresence } from './assertPresence.js';

describe('assertPresence', () => {
  it('should throw an error if the value is null', () => {
    expect(() => assertPresence(null)).toThrow();
  });

  it('should throw an error if the value is undefined', () => {
    expect(() => assertPresence(undefined)).toThrow();
  });

  it('should throw an error if the value is null and an error is provided', () => {
    expect(() => assertPresence(null, new Error('test'))).toThrow();
  });

  it('should throw an error if the value is undefined and an error is provided', () => {
    expect(() => assertPresence(undefined, new Error('test'))).toThrow();
  });
});

describe('assertArrayPresence', () => {
  it('should throw an error if the value is not an array', () => {
    expect(() => assertArrayPresence(null)).toThrow();
  });

  it('should throw an error if the value is not an array and an error is provided', () => {
    expect(() => assertArrayPresence(null, 'test')).toThrow();
  });
});
