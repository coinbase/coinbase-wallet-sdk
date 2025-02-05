import { assertSubAccountInfo } from './utils.js';

describe('assertSubAccountInfo', () => {
  it('should throw an error if the info is not an object', () => {
    expect(() => assertSubAccountInfo('')).toThrow();
  });

  it('should throw an error if the info is missing the address property', () => {
    expect(() => assertSubAccountInfo({})).toThrow();
  });

  it('should throw an error if the info is missing the chainId property', () => {
    expect(() => assertSubAccountInfo({ address: '0x1' })).toThrow();
  });

  it('should throw an error if the info is missing the owners property', () => {
    expect(() => assertSubAccountInfo({ address: '0x1', chainId: 1 })).toThrow();
  });

  it('should throw an error if the info is missing the ownerIndex property', () => {
    expect(() => assertSubAccountInfo({ address: '0x1', chainId: 1, owners: [] })).toThrow();
  });

  it('should throw an error if the info is missing the root property', () => {
    expect(() =>
      assertSubAccountInfo({ address: '0x1', chainId: 1, owners: [], ownerIndex: 0 })
    ).toThrow();
  });

  it('should throw an error if the info is missing the initCode property', () => {
    expect(() =>
      assertSubAccountInfo({ address: '0x1', chainId: 1, owners: [], ownerIndex: 0, root: '0x1' })
    ).toThrow();
  });

  it('should not throw an error if the info is valid', () => {
    expect(() =>
      assertSubAccountInfo({
        address: '0x1',
        chainId: 1,
        owners: [],
        ownerIndex: 0,
        root: '0x1',
        initCode: { factory: '0x1', factoryCalldata: '0x1' },
      })
    ).not.toThrow();
  });
});
