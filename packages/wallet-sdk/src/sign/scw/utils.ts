import { isAddress } from 'viem';

import { standardErrors } from ':core/error/errors.js';

export function assertGetCapabilitiesParams(
  params: unknown
): asserts params is [`0x${string}`, `0x${string}`[]?] {
  if (!params || !Array.isArray(params) || (params.length !== 1 && params.length !== 2)) {
    throw standardErrors.rpc.invalidParams();
  }

  if (typeof params[0] !== 'string' || !isAddress(params[0])) {
    throw standardErrors.rpc.invalidParams();
  }

  if (params.length === 2) {
    if (!Array.isArray(params[1])) {
      throw standardErrors.rpc.invalidParams();
    }

    for (const param of params[1]) {
      if (typeof param !== 'string' || !param.startsWith('0x')) {
        throw standardErrors.rpc.invalidParams();
      }
    }
  }
}
