import { SubAccountInfo } from './store.js';
import { standardErrors } from ':core/error/errors.js';

export function assertSubAccountInfo(info: unknown): asserts info is SubAccountInfo {
  if (typeof info !== 'object' || info === null) {
    throw standardErrors.rpc.internal('sub account info is not an object');
  }
  if (
    !('address' in info) ||
    !('chainId' in info) ||
    !('owners' in info) ||
    !('root' in info) ||
    !('initCode' in info)
  ) {
    throw standardErrors.rpc.internal('sub account is invalid');
  }
}
