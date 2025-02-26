import { isAddress, isHex } from 'viem';

import { SubAccountInfo } from './store.js';
import { standardErrors } from ':core/error/errors.js';

export function assertSubAccountInfo(info: unknown): asserts info is SubAccountInfo {
  if (typeof info !== 'object' || info === null) {
    throw standardErrors.rpc.internal('sub account info is not an object');
  }
  if (!('address' in info)) {
    throw standardErrors.rpc.internal('sub account is invalid');
  }
  if ('address' in info && typeof info.address === 'string' && !isAddress(info.address)) {
    throw standardErrors.rpc.internal('sub account address is invalid');
  }
  if ('factory' in info && typeof info.factory === 'string' && !isAddress(info.factory)) {
    throw standardErrors.rpc.internal('sub account factory address is invalid');
  }
  if ('factoryData' in info && typeof info.factoryData === 'string' && !isHex(info.factoryData)) {
    throw standardErrors.rpc.internal('sub account factory data is invalid');
  }
}
