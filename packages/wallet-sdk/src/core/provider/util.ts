import { LIB_VERSION } from '../../version';
import { standardErrors } from '../error';
import { ProviderInterface, RequestArguments } from './interface';
import { Chain } from ':core/type';

export async function fetchRPCRequest(request: RequestArguments, chain: Chain) {
  if (!chain.rpcUrl) throw standardErrors.rpc.internal('No RPC URL set for chain');

  const requestBody = {
    ...request,
    jsonrpc: '2.0',
    id: crypto.randomUUID(),
  };
  const res = await window.fetch(chain.rpcUrl, {
    method: 'POST',
    body: JSON.stringify(requestBody),
    mode: 'cors',
    headers: { 'Content-Type': 'application/json', 'X-Cbw-Sdk-Version': LIB_VERSION },
  });
  const response = await res.json();
  return response.result;
}

export interface Window {
  top: Window;
  ethereum?: ProviderInterface;
  coinbaseWalletExtension?: ProviderInterface;
}

export function getCoinbaseInjectedProvider(
  smartWalletOnly: boolean
): ProviderInterface | undefined {
  const window = globalThis as Window;

  if (!smartWalletOnly) {
    const extension = window.coinbaseWalletExtension;
    if (extension && !('shouldUseSigner' in extension && extension.shouldUseSigner)) {
      return extension;
    }
  }

  const ethereum = window.ethereum ?? window.top?.ethereum;
  if (ethereum && 'isCoinbaseBrowser' in ethereum && ethereum.isCoinbaseBrowser) {
    return ethereum;
  }

  return undefined;
}

/**
 * Validates the arguments for an invalid request and returns an error if any validation fails.
 * Valid request args are defined here: https://eips.ethereum.org/EIPS/eip-1193#request
 * @param args The request arguments to validate.
 * @returns An error object if the arguments are invalid, otherwise undefined.
 */
export function checkErrorForInvalidRequestArgs(args: RequestArguments) {
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
