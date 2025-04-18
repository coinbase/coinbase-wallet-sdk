import { Address } from 'viem';

import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { get } from ':util/get.js';

// ***************************************************************
// Utility
// ***************************************************************
export function getSenderFromRequest(request: RequestArguments) {
  if (!Array.isArray(request.params)) {
    return null;
  }
  switch (request.method) {
    case 'personal_sign':
      return request.params[1] as Address;
    case 'eth_signTypedData_v4':
      return request.params[0] as Address;
    case 'eth_signTransaction':
    case 'eth_sendTransaction':
    case 'wallet_sendCalls':
      return request.params[0]?.from as Address;
    default:
      return null;
  }
}

export function addSenderToRequest(request: RequestArguments, sender: Address) {
  if (!Array.isArray(request.params)) {
    throw standardErrors.rpc.invalidParams();
  }
  const params = [...request.params];
  switch (request.method) {
    case 'eth_signTransaction':
    case 'eth_sendTransaction':
    case 'wallet_sendCalls':
      params[0].from = sender;
      break;
    case 'eth_signTypedData_v4':
      params[0] = sender;
      break;
    case 'personal_sign':
      params[1] = sender;
      break;
    default:
      break;
  }

  return { ...request, params };
}

export function assertParamsChainId(params: unknown): asserts params is [
  {
    chainId: `0x${string}`;
  },
] {
  if (!params || !Array.isArray(params) || !params[0]?.chainId) {
    throw standardErrors.rpc.invalidParams();
  }
  if (typeof params[0].chainId !== 'string' && typeof params[0].chainId !== 'number') {
    throw standardErrors.rpc.invalidParams();
  }
}

export function injectRequestCapabilities(
  request: RequestArguments,
  capabilities: Record<string, unknown>
) {
  // Modify request to include auto sub account capabilities
  const modifiedRequest = { ...request };

  if (capabilities && ['wallet_sendCalls', 'wallet_connect'].includes(request.method)) {
    let requestCapabilities = get(modifiedRequest, 'params.0.capabilities');

    if (typeof requestCapabilities === 'undefined') {
      requestCapabilities = {};
    }

    if (typeof requestCapabilities !== 'object') {
      throw standardErrors.rpc.invalidParams();
    }

    requestCapabilities = {
      ...capabilities,
      ...requestCapabilities,
    };

    if (modifiedRequest.params && Array.isArray(modifiedRequest.params)) {
      modifiedRequest.params[0] = {
        ...modifiedRequest.params[0],
        capabilities: requestCapabilities,
      };
    }
  }

  return modifiedRequest;
}
