import { standardErrors } from '../../core/error';
import { RequestArguments } from '../ProviderInterface';

/**
 * Validates the arguments for an invalid request and returns an error if any validation fails.
 * Valid request args are defined here: https://eips.ethereum.org/EIPS/eip-1193#request
 * @param args The request arguments to validate.
 * @returns An error object if the arguments are invalid, otherwise undefined.
 */
export function getErrorForInvalidRequestArgs(args: RequestArguments) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return standardErrors.rpc.invalidRequest({
      message: 'Expected a single, non-array, object argument.',
      data: args,
    });
  }

  const { method, params } = args;

  if (typeof method !== 'string' || method.length === 0) {
    return standardErrors.rpc.invalidRequest({
      message: "'args.method' must be a non-empty string.",
      data: args,
    });
  }

  if (
    params !== undefined &&
    !Array.isArray(params) &&
    (typeof params !== 'object' || params === null)
  ) {
    return standardErrors.rpc.invalidRequest({
      message: "'args.params' must be an object or array if provided.",
      data: args,
    });
  }
  return undefined;
}

const methodsThatRequireSigning = [
  'eth_requestAccounts',
  'eth_sign',
  'eth_ecRecover',
  'personal_sign',
  'personal_ecRecover',
  'eth_signTransaction',
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  'eth_signTypedData_v1',
  'eth_signTypedData_v2',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'eth_signTypedData',
  'wallet_addEthereumChain',
  'wallet_switchEthereumChain',
  'wallet_watchAsset',
];

export function requiresSigning(method: string) {
  return (
    methodsThatRequireSigning.includes(method) ||
    method.startsWith('eth_send') ||
    method.startsWith('eth_sign')
  );
}
