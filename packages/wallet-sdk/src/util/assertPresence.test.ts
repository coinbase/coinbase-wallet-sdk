import { assetArrayPresence, assetPresence } from './assertPresence.js';

describe('assertPresence', () => {
  it('should throw an error if the value is null', () => {
    expect(() => assetPresence(null)).toThrow();
  });
});

describe('assetArrayPresence', () => {
  it('should throw an error if the value is not an array', () => {
    expect(() => assetArrayPresence(null)).toThrow();
  });
});
