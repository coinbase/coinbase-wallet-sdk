import { LIB_VERSION } from '../version';
import { standardErrors } from ':core/error';
import { RequestArguments } from ':core/provider/interface';

export async function fetchRPCRequest(request: RequestArguments, rpcUrl: string) {
  return window
    .fetch(rpcUrl, {
      method: 'POST',
      body: JSON.stringify({
        ...request,
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
      }),
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', 'X-Cbw-Sdk-Version': LIB_VERSION },
    })
    .then((response) => response.json())
    .then(({ result, error }) => {
      if (error) throw error;
      return result;
    });
}

/**
 * Validates the arguments for an invalid request and returns an error if any validation fails.
 * Valid request args are defined here: https://eips.ethereum.org/EIPS/eip-1193#request
 * @param args The request arguments to validate.
 * @returns An error object if the arguments are invalid, otherwise undefined.
 */
export function checkErrorForInvalidRequestArgs(args: unknown): asserts args is RequestArguments {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw standardErrors.rpc.invalidParams({
      message: 'Expected a single, non-array, object argument.',
      data: args,
    });
  }

  const { method, params } = args as RequestArguments;

  if (typeof method !== 'string' || method.length === 0) {
    throw standardErrors.rpc.invalidParams({
      message: "'args.method' must be a non-empty string.",
      data: args,
    });
  }

  if (
    params !== undefined &&
    !Array.isArray(params) &&
    (typeof params !== 'object' || params === null)
  ) {
    throw standardErrors.rpc.invalidParams({
      message: "'args.params' must be an object or array if provided.",
      data: args,
    });
  }

  switch (method) {
    case 'eth_sign':
    case 'eth_signTypedData_v2':
    case 'eth_subscribe':
    case 'eth_unsubscribe':
      throw standardErrors.provider.unsupportedMethod();
  }
}
