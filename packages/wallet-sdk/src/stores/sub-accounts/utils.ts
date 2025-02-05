import { SubAccountInfo } from './store.js';

export function assertSubAccountInfo(info: unknown): asserts info is SubAccountInfo {
  if (typeof info !== 'object' || info === null) {
    throw new Error('info is not an object');
  }

  if (!('address' in info)) {
    throw new Error('address is required');
  }

  if (!('chainId' in info)) {
    throw new Error('chainId is required');
  }

  if (!('owners' in info)) {
    throw new Error('owners is required');
  }

  if (!('root' in info)) {
    throw new Error('root is required');
  }

  if (!('initCode' in info)) {
    throw new Error('initCode is required');
  }
}
