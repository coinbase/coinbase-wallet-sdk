import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { Address } from ':core/type/index.js';

/////////////////////////////////////////////////////////////////////////////////////////////
// Utility
/////////////////////////////////////////////////////////////////////////////////////////////
export function get(obj: unknown, path: string): unknown {
  if (typeof obj !== 'object' || obj === null) return undefined;
  return path
    .split(/[.[\]]+/)
    .filter(Boolean)
    .reduce<unknown>((value, key) => {
      if (typeof value === 'object' && value !== null) {
        return (value as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
}

export function getSenderFromRequest(request: RequestArguments) {
  if (!Array.isArray(request.params)) {
    return null;
  }
  switch (request.method) {
    case 'personal_sign':
      // https://docs.metamask.io/wallet/reference/json-rpc-methods/personal_sign/
      return request.params[1] as Address;
    case 'eth_signTypedData_v4':
      // https://docs.metamask.io/wallet/reference/json-rpc-methods/eth_signtypeddata_v4/
      return request.params[0] as Address;
    case 'eth_signTransaction':
    case 'eth_sendTransaction':
    case 'wallet_sendCalls':
      //docs.metamask.io/snaps/reference/keyring-api/chain-methods/#eth_signtransaction
      // https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sendtransaction
      // https://www.eip5792.xyz/reference/sendCalls
      return request.params[0]?.from as Address;
    default:
      return null;
  }
}

export function enhanceRequestParams(request: RequestArguments, sender: Address) {
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
