import { assetArrayPresence, assetPresence } from './assertPresence.js';

describe('assertPresence', () => {
  it('should throw an error if the value is null', () => {
    expect(() => assetPresence(null)).toThrow();
  });

  it('should throw an error if the value is undefined', () => {
    expect(() => assetPresence(undefined)).toThrow();
  });

  it('should throw an error if the value is null and an error is provided', () => {
    expect(() => assetPresence(null, new Error('test'))).toThrow();
  });

  it('should throw an error if the value is undefined and an error is provided', () => {
    expect(() => assetPresence(undefined, new Error('test'))).toThrow();
  });
});

describe('assetArrayPresence', () => {
  it('should throw an error if the value is not an array', () => {
    expect(() => assetArrayPresence(null)).toThrow();
  });

  it('should throw an error if the value is not an array and an error is provided', () => {
    expect(() => assetArrayPresence(null, 'test')).toThrow();
  });
});
