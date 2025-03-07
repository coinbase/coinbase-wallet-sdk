import { assertSubAccount } from './assertSubAccount.js';
import { standardErrors } from ':core/error/errors.js';

describe('assertSubAccount', () => {
  it('should throw an error if the info is not an object', () => {
    expect(() => assertSubAccount('')).toThrow();
  });

  it('should throw an error if the info is an empty object', () => {
    expect(() => assertSubAccount({})).toThrow(
      standardErrors.rpc.internal('sub account is invalid')
    );
  });

  it('should throw an error if the address is missing', () => {
    expect(() =>
      assertSubAccount({ factory: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' })
    ).toThrow(standardErrors.rpc.internal('sub account is invalid'));
  });

  it('should throw an error if the address is invalid', () => {
    expect(() => assertSubAccount({ address: 'invalid-address' })).toThrow(
      standardErrors.rpc.internal('sub account address is invalid')
    );
  });

  it('should not throw an error if the address is valid', () => {
    expect(() =>
      assertSubAccount({ address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' })
    ).not.toThrow();
  });

  it('should throw an error if the factory is invalid', () => {
    expect(() =>
      assertSubAccount({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        factory: 'invalid-factory',
      })
    ).toThrow(standardErrors.rpc.internal('sub account factory address is invalid'));
  });

  it('should not throw an error if the factory is valid', () => {
    expect(() =>
      assertSubAccount({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        factory: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      })
    ).not.toThrow();
  });

  it('should throw an error if the factoryData is invalid', () => {
    expect(() =>
      assertSubAccount({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        factoryData: 'invalid-data',
      })
    ).toThrow(standardErrors.rpc.internal('sub account factory data is invalid'));
  });

  it('should not throw an error if the factoryData is valid', () => {
    expect(() =>
      assertSubAccount({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        factoryData: '0x1234',
      })
    ).not.toThrow();
  });

  it('should not throw an error for a complete valid object', () => {
    expect(() =>
      assertSubAccount({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        chainId: 1,
        owners: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'],
        ownerIndex: 0,
        root: '0x1234',
        factory: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        factoryData: '0x1234',
      })
    ).not.toThrow();
  });
});
